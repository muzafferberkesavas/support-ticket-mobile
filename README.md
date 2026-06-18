# Destek Mobil — Support Ticket Mobile

[support-ticket-system](https://github.com/muzafferberkesavas/support-ticket-system) projesinin **React Native + Expo (TypeScript)** ile geliştirilmiş mobil istemcisi. Yeni bir backend yazılmamıştır — mevcut **Node.js + Express + PostgreSQL** API'si ve **JWT** kimlik doğrulaması yeniden kullanılır.

Mobil uygulama, web arayüzündeki son kullanıcı (rol: `user`) akışını birebir taşır: kayıt olma, giriş yapma, taleplerini listeleme/filtreleme, oluşturma, düzenleme, silme, yanıtlama, kapalı talebi yeniden açma ve puanlama (CSAT). Kullanıcı **yalnızca kendi taleplerini** görür.

Bunun ötesinde, web panelinin **personel/admin** özellikleri de role göre mobile taşınmıştır: pano (KPI'lar), **analitik** (Claude ile tekrar-eden-problem içgörüsü + öneriler), kullanıcı & departman yönetimi, SLA ayarları, operasyonlar (iş kuyruğu + dışa aktarım), hazır yanıtlar, bildirim merkezi; talep detayında atama/durum/yükseltme/dahili not ve listede toplu işlemler. Uygulama ayrıca **karanlık mod** (Profil → Görünüm: Sistem/Açık/Koyu) ve **gerçek zamanlı** güncelleme içerir. Backend **Kubernetes (k3s)** üzerinde çalışır; ayrıntı için web reposuna bakın.

## İçindekiler

- [Özellikler](#özellikler)
- [Mobile özgü özellikler](#mobile-özgü-özellikler)
- [Teknolojiler](#teknolojiler)
- [Önkoşullar (Backend)](#önkoşullar-backend)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
- [API Adresini Yapılandırma](#api-adresini-yapılandırma)
- [Taşınan İş Kuralları](#taşınan-iş-kuralları)
- [Görsel Ayrımlar](#görsel-ayrımlar)
- [Proje Yapısı](#proje-yapısı)
- [Kullanılan API Uç Noktaları](#kullanılan-api-uç-noktaları)

## Özellikler

| İşlev | Açıklama |
| ----- | -------- |
| Kayıt / Giriş | E-posta + parola; JWT döner ve güvenli depolanır |
| Talep listeleme | Kullanıcının kendi talepleri; durum/öncelik filtresi + arama |
| Talep oluşturma | Konu, mesaj, öncelik, kategori, etiketler (backend doğrulamasıyla aynı) |
| Talep detayı | Mesaj, ekler, yanıt konuşması, SLA durumu |
| Düzenleme | Sahibi içerik alanlarını (konu/mesaj/öncelik/kategori/etiket) günceller |
| Silme | Sahibi kendi talebini siler (onaylı) |
| Yanıtlama | Talep konuşmasına mesaj ekleme |
| Yeniden açma | Kapalı bir talebi yeniden açma |
| CSAT | Kapalı talebi 1–5 yıldız ile bir kez puanlama |
| Sesli not | Talebe mikrofonla ses kaydı ekleme (ek olarak yüklenir) |
| Gerçek zamanlı | Liste/detay canlı senkron + "yazıyor / görüntülüyor" göstergeleri |
| Çevrimdışı kuyruk | Çevrimdışı oluşturulan talepler kuyruğa alınıp bağlanınca senkronlanır |
| Bildirim merkezi | Uygulama-içi bildirim listesi + okunmamış rozeti |
| Personel / Admin | Rol-gateli pano, analitik (Claude), kullanıcı/departman, SLA, operasyonlar, atama/durum/dahili not, toplu işlem |
| Karanlık mod | Profil → Görünüm: Sistem / Açık / Koyu |
| Profil | Ad güncelleme, parola değiştirme, çıkış |

## Mobile özgü özellikler

Görev **en az bir** mobile özgü özellik istiyordu; akışa anlamlı biçimde entegre edilmiş **dört cihaz yeteneği** vardır (biyometri, kamera, ses kaydı, çevrimdışı kuyruk) — _"ne kadar karmaşıksa o kadar iyi"_. Profil → **Mobil Özellikler** ekranından da listelenir.

### 1. Biyometrik kimlik doğrulama (Face ID / Touch ID / parmak izi)
- JWT, `expo-secure-store` ile cihazın **donanım destekli güvenli deposunda** (iOS Keychain / Android Keystore) tutulur — düz metin `AsyncStorage` kullanılmaz.
- Profil → Güvenlik'ten biyometrik giriş açılıp kapatılır. Etkinken uygulama açılışta **kilit ekranı** gösterir; token yalnızca `expo-local-authentication` ile başarılı doğrulama sonrası kullanılır (cihaz parolasına fallback). Profil'deki **"Şimdi kilitle"** ile anında kilit denenebilir.
- İlgili kod: `src/auth/biometrics.ts`, `src/auth/secureStore.ts`, `src/auth/AuthContext.tsx`, `app/lock.tsx`.

### 2. Kamera / galeri ile görsel ekleme
- Talep detayında **Görsel** ile kameradan fotoğraf çekilir veya galeriden seçilir (`expo-image-picker`); izinler çalışma anında istenir.
- Görsel, mevcut `POST /tickets/:id/attachments` (multipart) uç noktasına yüklenir.
- İlgili kod: `app/ticket/[id].tsx`, `src/api/tickets.ts` (`uploadAttachment`).

### 3. Sesli not / ses kaydı (`expo-audio`)
- Talep detayındaki **Ekler** bölümünde **Ses kaydı** ile mikrofondan sesli not kaydedilir; durdurulunca dosya (m4a) talebe **ek olarak yüklenir** ve file-service/DB'de saklanır — sorunu yazmak yerine anlatabilirsiniz.
- Yeni backend gerektirmez; mevcut ek-yükleme uç noktası kullanılır (backend, ses mime tiplerine izin verecek şekilde güncellendi).
- İlgili kod: `src/components/VoiceRecorder.tsx`, `app/ticket/[id].tsx`.

### 4. Çevrimdışı-öncelikli kuyruk + senkron (`expo-network` + `AsyncStorage`)
- İnternet yokken oluşturulan talepler yerelde (`@react-native-async-storage/async-storage`) **kuyruğa alınır**; bağlantı geldiğinde `expo-network` dinleyicisi kuyruğu mevcut `POST /tickets` ile **otomatik senkronlar**.
- Talep listesinde **çevrimdışı / senkronlanıyor** göstergesi (kuyruk sayısıyla) gösterilir.
- İlgili kod: `src/offline/OfflineContext.tsx`, `app/(tabs)/new.tsx`, `app/(tabs)/index.tsx`.

## Teknolojiler

- **React Native 0.85 + Expo SDK 56 + TypeScript**
- **expo-router** (dosya tabanlı navigasyon)
- **@tanstack/react-query** (sunucu durumu, önbellek, yeniden çekme)
- **axios** (JWT interceptor'lı API istemcisi)
- **socket.io-client** (gerçek zamanlı: liste/detay senkron + "yazıyor/görüntülüyor")
- **expo-secure-store** · **expo-local-authentication** (biyometri) · **expo-image-picker** (görsel ek)
- **expo-audio** (sesli not) · **expo-network** + **@react-native-async-storage/async-storage** (çevrimdışı kuyruk)

## Önkoşullar (Backend)

Mobil uygulama mevcut backend'e bağlanır. Önce onu çalıştırın:

```bash
git clone https://github.com/muzafferberkesavas/support-ticket-system
cd support-ticket-system
cp .env.example .env
docker compose up --build      # API: http://localhost:3000
```

> Backend, `CORS_ORIGIN` için `http://localhost:5173` varsayar; mobil isteklerde sorun olursa
> `.env` içinde `CORS_ORIGIN=*` yaparak tüm kaynaklara izin verebilirsiniz.

## Kurulum ve Çalıştırma

```bash
git clone <bu-repo>
cd support-ticket-mobile
npm install

cp .env.example .env           # API adresini ortamınıza göre düzenleyin (aşağıya bakın)

npm run start                  # Expo geliştirme sunucusu (QR kod / tuş seçenekleri)
# veya doğrudan:
npm run ios                    # iOS simülatör
npm run android                # Android emülatör
```

Expo Go uygulaması ile QR kodu okutarak fiziksel cihazda da çalıştırabilirsiniz.

> **Not:** Biyometrik giriş ve kamera, gerçek cihazda (veya biyometri tanımlı bir simülatörde)
> test edilir. iOS Simülatöründe **Features → Face ID → Enrolled** ayarını açıp doğrulamayı
> **Matching/Non-matching Face** ile tetikleyebilirsiniz.

## API Adresini Yapılandırma

Uygulama API adresini `EXPO_PUBLIC_API_URL` ortam değişkeninden okur (`src/config.ts`). `.env` dosyasında ayarlayın:

| Ortam | Değer |
| ----- | ----- |
| iOS simülatör | `http://localhost:3000` |
| Android emülatör | `http://10.0.2.2:3000` |
| Fiziksel cihaz | `http://<bilgisayarın-LAN-IP'si>:3000` (ör. `http://192.168.1.20:3000`) |

Ayar yoksa varsayılan `http://localhost:3000` kullanılır.

## Taşınan İş Kuralları

Backend'deki yetki ve doğrulama kuralları mobilde de uygulanır:

- **Yalnızca kendi kayıtları:** Liste isteği backend tarafından `userId`'ye kapsamlanır; kullanıcı başkasının talebini göremez.
- **Düzenleme sınırı:** Son kullanıcı yalnızca içerik alanlarını (konu, mesaj, öncelik, kategori, etiket) düzenler. Durum (status) ve departman değişikliği yalnızca personele aittir; mobil bu alanları kullanıcıya sunmaz.
- **Silme:** Yalnızca talep sahibi (veya admin) siler.
- **Yeniden açma:** Yalnızca kapalı talep yeniden açılabilir.
- **CSAT:** Kapalı bir talep yalnızca sahibi tarafından ve yalnızca bir kez puanlanır.
- **Form doğrulaması:** Konu 3–150, mesaj 5–5000, parola en az 6 karakter, en fazla 15 etiket (her biri ≤30 karakter) — backend Zod şemalarıyla birebir.
- **Dahili notlar** son kullanıcıdan gizlidir (backend yanıtta zaten filtreler).

## Görsel Ayrımlar

Web (PrimeVue) ile aynı renk/anlam kullanılır:

- **Öncelik:** Düşük → yeşil · Orta → mavi · Yüksek → kırmızı
- **Durum:** Açık → amber · İşlemde → mavi · Kapalı → gri
- **SLA rozeti:** Yükseltildi / Gecikti → kırmızı · Yakında doluyor (kalan < hedefin %20'si) → amber

Eşleme `src/theme/index.ts` içinde tanımlıdır.

## Proje Yapısı

```
app/                      # expo-router rotaları
  _layout.tsx             # Provider'lar (Auth/Offline/Toast/Query) + Stack.Protected yönlendirme + tema kapısı
  login.tsx · register.tsx · lock.tsx   # Giriş / Kayıt / Biyometrik kilit ekranı
  (tabs)/                 # Alt sekmeler: dashboard (Pano), index (Talepler), new (Yeni), admin (Yönetim), profile
  ticket/[id].tsx         # Talep detayı (yanıt, atama/durum/yükselt, dahili not, görsel + sesli not ekle, CSAT)
  edit/[id].tsx           # Talebi düzenle
  admin/                  # users, departments, analytics, sla, canned, operations (rol-gateli)
  notifications.tsx       # Bildirim merkezi
  features.tsx            # Mobil Özellikler vitrini
src/
  api/                    # client (axios+interceptor) + tickets/users/departments/analytics/sla/canned/operations/notifications/dashboard
  auth/                   # AuthContext, secureStore (JWT), biometrics, roles
  offline/                # OfflineContext — çevrimdışı kuyruk + senkron
  components/             # ui, ticket (rozet/kart), TicketForm, VoiceRecorder, SelectList, GradientHeader, Toast …
  realtime/               # socket.io istemcisi + RealtimeBridge
  theme/                  # açık/koyu palet + priority/status/SLA eşlemeleri + tema tercihi (pref)
  types.ts · config.ts    # backend ile uyumlu tipler · API adresi + anahtarlar
```

## Kullanılan API Uç Noktaları

| Yöntem | Yol | Kullanım |
| ------ | --- | -------- |
| POST | `/auth/register` | Kayıt |
| POST | `/auth/login` | Giriş |
| GET | `/auth/me` | Oturum doğrulama |
| PATCH | `/auth/profile` | Ad güncelleme |
| POST | `/auth/change-password` | Parola değiştirme |
| GET | `/tickets` | Liste (status/priority/search filtreleri) |
| POST | `/tickets` | Oluştur |
| GET | `/tickets/:id` | Detay |
| PUT | `/tickets/:id` | Düzenle |
| DELETE | `/tickets/:id` | Sil |
| POST | `/tickets/:id/replies` | Yanıt ekle |
| POST | `/tickets/:id/reopen` | Yeniden aç |
| POST | `/tickets/:id/csat` | Puanla |
| POST | `/tickets/:id/attachments` | Görsel **ve sesli not** ekle (multipart) |

Personel/admin ekranları ayrıca şu mevcut uç noktaları kullanır (yeni backend yok): `/dashboard`, `/analytics`, `/users`, `/departments`, `/sla`, `/jobs/*`, `/canned`, `/notifications`, `/tickets/:id/assign`, `/tickets/:id/escalate`, `/tickets/bulk`. Gerçek zamanlı olaylar Socket.IO ile alınır.

---

JWT tüm korumalı isteklere `Authorization: Bearer <token>` başlığıyla eklenir (`src/api/client.ts`).
401 yanıtında oturum otomatik kapatılır.
