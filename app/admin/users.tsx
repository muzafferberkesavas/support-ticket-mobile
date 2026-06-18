import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, listUsers, updateUser } from '@/api/users';
import { listDepartments } from '@/api/departments';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ROLE_LABELS } from '@/auth/roles';
import { Badge, Banner, Button, Card, EmptyState, TextField } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SelectList } from '@/components/SelectList';
import { colors, shadow } from '@/theme';
import type { Role, User } from '@/types';

const ROLE_VALUES: Role[] = ['user', 'agent', 'team_lead', 'admin'];

interface FormState {
  email: string;
  fullName: string;
  role: Role;
  departmentIds: string[];
}
const EMPTY_FORM: FormState = { email: '', fullName: '', role: 'agent', departmentIds: [] };

export default function UsersScreen() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [tempPw, setTempPw] = useState<{ email: string; pw: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const usersQuery = useQuery({ queryKey: ['users', search], queryFn: () => listUsers({ search: search || undefined }) });
  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: listDepartments, enabled: modal });

  const users = usersQuery.data ?? [];
  const deptOptions = useMemo(
    () => (deptsQuery.data ?? []).map((d) => ({ id: d.id, label: d.name })),
    [deptsQuery.data],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const createMut = useMutation({
    mutationFn: () =>
      createUser({
        email: form.email.trim(),
        fullName: form.fullName.trim() || undefined,
        role: form.role,
        departmentIds: form.departmentIds,
      }),
    onSuccess: async (res) => {
      setModal(false);
      setTempPw({ email: res.user.email, pw: res.tempPassword });
      await invalidate();
    },
    onError: (e) => setErr(extractErrorMessage(e, 'Kullanıcı oluşturulamadı.')),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateUser(editing!.id, {
        fullName: form.fullName.trim() || null,
        role: form.role,
        departmentIds: form.departmentIds,
      }),
    onSuccess: async () => {
      setModal(false);
      await invalidate();
    },
    onError: (e) => setErr(extractErrorMessage(e, 'Güncellenemedi.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErr(null);
    setModal(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({
      email: u.email,
      fullName: u.fullName ?? '',
      role: u.role,
      departmentIds: (u.memberships ?? []).map((m) => m.department.id),
    });
    setErr(null);
    setModal(true);
  }
  function confirmDelete(u: User) {
    Alert.alert('Kullanıcıyı sil', `${u.fullName || u.email} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMut.mutate(u.id) },
    ]);
  }
  function toggleDept(id: string) {
    setForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(id)
        ? f.departmentIds.filter((x) => x !== id)
        : [...f.departmentIds, id],
    }));
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Kullanıcılar',
          headerRight: () => (
            <Pressable onPress={openCreate} hitSlop={10}>
              <Icon name="add-circle" size={26} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <View style={styles.searchRow}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="E-posta veya ad ara…"
          containerStyle={styles.searchField}
          style={styles.searchInput}
        />
      </View>

      {usersQuery.isError ? <View style={styles.pad}><Banner text={extractErrorMessage(usersQuery.error)} /></View> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={usersQuery.isFetching} onRefresh={() => usersQuery.refetch()} />}
      >
        {users.length === 0 && !usersQuery.isLoading ? (
          <EmptyState title="Kullanıcı yok" subtitle="Aramayı değiştirin ya da ＋ ile ekleyin." icon="people-outline" />
        ) : null}
        {users.map((u) => {
          const depts = (u.memberships ?? []).map((m) => m.department.name);
          return (
            <Card key={u.id} style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(u.fullName || u.email).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.name}>{u.fullName || '—'}</Text>
                  <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                </View>
                <Badge label={ROLE_LABELS[u.role]} fg={colors.primary} bg={colors.primarySoft} />
              </View>
              <View style={styles.userMeta}>
                <View style={styles.metaItem}>
                  <Icon name="git-network-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>{depts.length ? depts.join(', ') : 'Departman yok'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="reader-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>{u._count?.tickets ?? 0} talep</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Button title="Düzenle" variant="secondary" icon="create-outline" onPress={() => openEdit(u)} style={styles.actionBtn} />
                {u.id !== me?.id ? (
                  <Button title="Sil" variant="danger" icon="trash-outline" onPress={() => confirmDelete(u)} style={styles.actionBtn} />
                ) : null}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Oluştur/Düzenle modalı */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{editing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}</Text>
                <Pressable onPress={() => setModal(false)} hitSlop={10}>
                  <Icon name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>

              {err ? <Banner text={err} /> : null}

              <TextField
                label="E-posta"
                value={form.email}
                onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
                placeholder="ornek@firma.com"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!editing}
              />
              <TextField
                label="Ad Soyad"
                value={form.fullName}
                onChangeText={(t) => setForm((f) => ({ ...f, fullName: t }))}
                placeholder="(isteğe bağlı)"
              />

              <Text style={styles.label}>Rol</Text>
              <View style={styles.roleRow}>
                {ROLE_VALUES.map((r) => {
                  const active = form.role === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setForm((f) => ({ ...f, role: r }))}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                    >
                      <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{ROLE_LABELS[r]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Departmanlar</Text>
              <SelectList
                options={deptOptions}
                selected={form.departmentIds}
                onToggle={toggleDept}
                empty="Departman bulunamadı."
              />

              <Button
                title={editing ? 'Kaydet' : 'Oluştur'}
                onPress={() => (editing ? updateMut.mutate() : createMut.mutate())}
                loading={saving}
                disabled={!editing && !form.email.trim()}
                style={styles.saveBtn}
              />
              <Button title="Vazgeç" variant="ghost" onPress={() => setModal(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Geçici parola gösterimi */}
      <Modal visible={!!tempPw} animationType="fade" transparent onRequestClose={() => setTempPw(null)}>
        <View style={styles.backdrop}>
          <View style={styles.pwCard}>
            <Icon name="key-outline" size={30} color={colors.primary} />
            <Text style={styles.pwTitle}>Kullanıcı oluşturuldu</Text>
            <Text style={styles.pwSub}>{tempPw?.email} için geçici parola. Kullanıcı ilk girişte değiştirecek.</Text>
            <View style={styles.pwBox}><Text style={styles.pwText}>{tempPw?.pw}</Text></View>
            <Button title="Tamam" onPress={() => setTempPw(null)} style={styles.saveBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16 },
  flex1: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    ...shadow.sm,
  },
  searchField: { flex: 1, marginBottom: 0 },
  searchInput: { paddingVertical: 11, borderWidth: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  list: { padding: 16, paddingTop: 8, flexGrow: 1 },
  userCard: { marginBottom: 12 },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800', color: colors.primary },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted },
  userMeta: { flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaText: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,18,30,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 14, marginBottom: 8 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  roleChipTextActive: { color: colors.white },
  saveBtn: { marginTop: 18 },
  pwCard: { backgroundColor: colors.surface, margin: 24, borderRadius: 18, padding: 22, alignItems: 'center', alignSelf: 'center', width: '86%' },
  pwTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 8 },
  pwSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  pwBox: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, marginTop: 14 },
  pwText: { fontSize: 20, fontWeight: '800', color: colors.primaryDark, letterSpacing: 1 },
});
