# Destek Mobil — Support Ticket Mobile

[support-ticket-system](https://github.com/muzafferberkesavas/support-ticket-system) projesinin **React Native + Expo (TypeScript)** ile geliştirilmiş mobil istemcisi. Yeni bir backend yazılmamıştır — mevcut **Node.js + Express + PostgreSQL** API'si ve **JWT** kimlik doğrulaması yeniden kullanılır.

Mobil uygulama, web arayüzündeki son kullanıcı (rol: `user`) akışını birebir taşır: kayıt olma, giriş yapma, taleplerini listeleme/filtreleme, oluşturma, düzenleme, silme, yanıtlama, kapalı talebi yeniden açma ve puanlama (CSAT). Kullanıcı **yalnızca kendi taleplerini** görür.

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
| Profil | Ad güncelleme, parola değiştirme, çıkış |

## Mobile özgü özellikler

Görevin zorunlu kıldığı cihaz yeteneklerinden **iki tanesi** anlamlı biçimde akışa entegre edilmiştir:

### 1. Biyometrik kimlik doğrulama (Face ID / Touch ID / parmak izi)
- JWT, `expo-secure-store` ile cihazın **donanım destekli güvenli deposunda** (iOS Keychain / Android Keystore) tutulur — düz metin `AsyncStorage` kullanılmaz.
- Girişten sonra cihaz destekliyorsa biyometrik giriş etkinleştirilebilir (Profil ekranından da açılıp kapatılabilir).
- Etkinleştirildiğinde uygulama her açılışta **kilit ekranı** gösterir; token bellekte ancak `expo-local-authentication` ile başarılı doğrulama sonrası kullanılır. Doğrulama cihaz parolasına geri düşebilir (fallback).
- İlgili kod: `src/auth/biometrics.ts`, `src/auth/secureStore.ts`, `src/auth/AuthContext.tsx`, `app/lock.tsx`.

### 2. Kamera / galeri ile görsel ekleme
- Talep detayında **📷 Görsel ekle** ile kameradan fotoğraf çekilebilir veya galeriden seçilebilir (`expo-image-picker`), izinler çalışma anında istenir.
- Görsel, mevcut `POST /tickets/:id/attachments` (multipart) uç noktasına yüklenir.
- Başarılı işlemlerde dokunsal geri bildirim için `expo-haptics` kullanılır.
- İlgili kod: `app/ticket/[id].tsx`, `src/api/tickets.ts` (`uploadAttachment`).

## Teknolojiler

- **React Native 0.85 + Expo SDK 56 + TypeScript**
- **expo-router** (dosya tabanlı navigasyon)
- **@tanstack/react-query** (sunucu durumu, önbellek, yeniden çekme)
- **axios** (JWT interceptor'lı API istemcisi)
- **expo-secure-store** · **expo-local-authentication** · **expo-image-picker** · **expo-haptics**

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
  _layout.tsx             # Provider'lar + auth durumuna göre Stack.Protected yönlendirme
  login.tsx               # Giriş (+ biyometrik giriş önerisi)
  register.tsx            # Kayıt
  lock.tsx                # Biyometrik kilit ekranı
  index.tsx               # Talep listesi + filtre/arama
  new.tsx                 # Yeni talep
  ticket/[id].tsx         # Talep detayı (yanıt, yeniden aç, CSAT, görsel ekle)
  edit/[id].tsx           # Talebi düzenle
  profile.tsx             # Profil, güvenlik (biyometri), parola, çıkış
src/
  api/                    # client.ts (axios+interceptor), auth.ts, tickets.ts
  auth/                   # AuthContext, secureStore (JWT), biometrics
  components/             # ui.tsx, ticket.tsx (rozetler/kart), TicketForm.tsx
  theme/                  # renkler + priority/status/SLA eşlemeleri
  types.ts                # backend ile uyumlu tipler
  config.ts               # API adresi + depolama anahtarları
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
| POST | `/tickets/:id/attachments` | Görsel ekle (multipart) |

---

JWT tüm korumalı isteklere `Authorization: Bearer <token>` başlığıyla eklenir (`src/api/client.ts`).
401 yanıtında oturum otomatik kapatılır.
