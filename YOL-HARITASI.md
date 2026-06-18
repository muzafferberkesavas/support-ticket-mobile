# Yol Haritası — Destek Mobil & LLM Analizi

> Repo incelemesi (mobil istemci + web `support-ticket-system`) ve mobile özgü özellik /
> Anthropic entegrasyonu araştırması temel alınarak hazırlandı. Görev kapsamı: mevcut API'yi
> yeniden kullanan mobil istemci + **en az bir (tercihen karmaşık) mobile özgü özellik**.
> Kapsam dışı (değişmez): yeni backend, ödeme, 3. parti servis, **remote push**, harici entegrasyon.

## 0. Mevcut Durum

| Katman | Durum |
| --- | --- |
| **Mobil** | Kayıt/giriş (JWT, `expo-secure-store`), ticket listele/filtre/ara, oluştur/düzenle/sil, yanıt, yeniden aç, CSAT, profil. Mobile özgü: **biyometrik giriş** + **kamera/galeri ile görsel ekleme** + haptics. GitHub'a push edilmiş. |
| **Web** | PrimeVue dashboard; **Analytics & Insights** ekranında "tekrar eden problemler" = `backend/src/services/textAnalysis.ts → analyzeThemes` (harici lib'siz, **anahtar-kelime/TF** tabanlı "NLP"). Ayrıca import, hazır yanıt (canned), gerçek zamanlı `socket.io` bildirimleri, i18n (TR/EN), karanlık mod, SLA, Excel/PDF dışa aktarım. |
| **Açık iz** | 10.06 raporunda başlatılıp 12.06'da "Devam" olarak taşınan **Anthropic API ile LLM tabanlı talep analizi** hâlâ teslim edilmedi. Aşağıdaki Faz 1 tam da bunu kapatıyor. |

---

## Faz 1 — NLP → Anthropic Claude API (en yüksek öncelik · açık izi kapatır)

Web'deki anahtar-kelime/TF tabanlı tema çıkarımını Claude tabanlı analizle değiştirmek.

- **Hedef kod:** `backend/src/services/textAnalysis.ts` (`analyzeThemes`) ve onu çağıran
  `backend/src/controllers/analytics.controller.ts` (`recurringProblems`).
- **Mimari (kritik):** `ANTHROPIC_API_KEY` **yalnızca Node/Express backend'de** durur; mobil
  veya web client'a **asla** gömülmez (bundle/`app.json extra`/env hepsi çıkarılabilir → kimlik
  sızıntısı + faturalama suistimali). Client mevcut **JWT** ile kendi endpoint'ine gider, backend
  Anthropic'e gider. Caching/batch/rate-limit/log merkezîleşir.
- **Model:** ucuz + hızlı sınıflandırma/özet için **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`);
  tema kalitesi yetmezse **Sonnet 4.6** (`claude-sonnet-4-6`) için ENV toggle.
- **Yapısal çıktı:** tek bir **tool (function calling)** tanımlayıp `tool_choice` ile çağırmaya
  zorlamak → şema-geçerli JSON: `themes:[{label, count, severity, exampleTicketIds, suggestedAction}]`.
  Serbest metin parse yok; mevcut `recurringProblems` şekline birebir map'lenir → **frontend/mobil değişmez**.
- **Maliyet kontrolü:** talimat + şema/taksonomi sabit bloğunu **prompt caching** ile cache'le;
  çok ticket için **Message Batches API** (gece job, ~%50 indirim). Batch boyutunu token sayımıyla ölç.
- **Geçiş planı (güvenli):** `analyzeThemes`'i silmeden arkasına bir `AnalysisProvider` arayüzü;
  ENV ile `nlp ↔ anthropic` seçimi (anahtar yoksa otomatik **fallback = mevcut TF**). Sonuç
  DB/Redis'e cache'lenir; `/analytics` yanıtı aynı alanları döndürür.
- **Anahtar teslimi:** kullanıcı sağlayınca `.env` (gitignore'da) → `ANTHROPIC_API_KEY`; **repoya girmez**,
  log'lanmaz. Mevcut 16.06 disiplini (kapsam dışını geri al) korunur.

## Faz 2 — Çalışma raporlarına LLM analizi (`calisma-raporu`)

- **Bugün yapıldı:** sabah raporuna "LLM ile Geçmişe Dönük Analiz" bölümü eklendi (Claude ile üretildi).
- **Otomatikleştirme:** küçük bir Node script `calisma-raporu/*.html` raporlarını okuyup Anthropic API'ye
  verir, üretilen analiz bloğunu sabah **ve gün sonu** şablonlarına gömer. Anahtar yalnızca yerelde.

## Faz 3 — Mobil ek cihaz özellikleri (zorunlu mobil özellik rubriğini güçlendirir)

Karmaşık + anlamlı entegre + managed Expo'da (eject'siz) gerçekçi, önceliğe göre:

| Öncelik | Özellik | Expo paketi | Akışa bağlanışı |
| --- | --- | --- | --- |
| **P1** | Kamera / **QR-barkod tarama** | `expo-camera` | Ekipman/varlık QR'ı veya basılı ticket no'yu tarayıp yeni talebi otomatik doldur; belge fotoğrafı ek. |
| **P1** | **Konuma göre** talep + en yakın şube | `expo-location` | GPS damgası + reverse-geocode; şubeleri yakınlığa göre sırala/filtrele. (Görevdeki "konuma göre filtreleme" örneğini karşılar.) |
| **P2** | **Çevrimdışı-öncelikli** kuyruk + senkron | `expo-background-task` + `expo-task-manager` + `react-query` (var) + `expo-sqlite`/`expo-network` | Çevrimdışı talep oluştur, bağlanınca otomatik senkronla. |
| **P2** | **Sesli** talep oluşturma (STT) | `@react-native-voice/voice` veya `expo-audio` + sunucu STT | Açıklamayı ellersiz dikte et. |
| **P3** | **Yerel** bildirim (remote push DEĞİL → kapsam içi) | `expo-notifications` | SLA/yanıt hatırlatıcısı cihazda zamanlanır. |
| **P3** | **Salla-bildir** | `expo-sensors` | Sallama hareketiyle "sorun bildir" sayfasını aç. |
| Polish | Haptics (var) + biyometrik **step-up** | `expo-haptics`, `expo-local-authentication` | Hassas aksiyonlarda (kapat/yükselt) ek doğrulama. |

> Önerilen vitrin demeti: **Kamera/QR + Konum** (ikisi de gerçek cihaz yeteneği, görsel olarak etkileyici).
> Not: remote push / ödeme / 3. parti = **kapsam dışı**.

## Faz 4 — Web ↔ mobil parite (bütünlük)

- **Gerçek zamanlı bildirimler:** web `socket.io` kullanıyor; mobilde `socket.io-client` ile canlı
  ticket/yanıt güncellemeleri.
- **Karanlık mod + i18n (TR/EN):** web'de mevcut, mobile taşınabilir.
- Staff'a özel (import / canned / analytics) son kullanıcı mobilinde **kapsam dışı** kalır.

---

## Önerilen Sıra

1. **Bugün:** uçtan uca doğrulama + teslim (mobil), giriş ekranı markasını web ile eşitleme *(yapıldı)*, bu yol haritası.
2. **Sonra-1:** Faz 1 — NLP → Anthropic landing (anahtar gelince) → 10.06'dan beri açık izi kapatır.
3. **Sonra-2:** Faz 3 P1 — Kamera/QR + Konum → rubrik puanını yükseltir.
4. **Sonra-3:** Faz 3 P2/P3 (çevrimdışı, sesli, yerel bildirim) + Faz 4 (gerçek zamanlı, dark/i18n).

> **Araştırma notu:** mobil özellik ve Anthropic mimarisi araştırması yapıldı; canlı web kaynakları
> ortam izinleri nedeniyle çekilemedi, bu yüzden Expo paket adları kurulu **SDK 56**'ya, model id'leri
> ise mevcut Claude sürümlerine (Haiku 4.5 / Sonnet 4.6) göre verildi. Anahtar geldiğinde model id'si
> ve fiyatlandırma canlı Anthropic dokümanından son kez teyit edilmeli.
