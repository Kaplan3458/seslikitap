# Sesli Kitap V2.3 — Kitaplı Tasarım

Bu sürüm V2.2 üzerinde hazırlanmıştır. Önceki tarayıcı kayıt anahtarları (`sk_v2_books`) ve PDF IndexedDB veritabanı (`sesli_kitap_local_v3`) değiştirilmedi; böylece mevcut kütüphane ve okuma konumları korunur.

## Yenilikler
- Yeni kitaplı yeşil-altın amblem (kitap-logo.png); yıldız ve eski yuvarlak dilim görseli kaldırıldı.
- Başlık tek font ve büyüklükte; alt başlık **Kişisel kütüphaneniz**.
- Ana sayfa metinleri istenen metinlerle güncellendi.
- Diğer sayfalarda emir kipi yerine daha nazik Türkçe ifadeler kullanıldı.
- Kullanıcının isteğiyle iPhone ekran kilidi uyarısı arayüzden kaldırıldı. **Bu durum arka planda kesintisiz seslendirme sağlandığı anlamına gelmez.**
- Kitap silme, yerel PDF saklama, kaldığınız yerden devam etme davranışı korundu.

## GitHub yükleme
Depoda kök dizine `index.html`, `styles.css`, `script.js`, `manifest.json`, `kitap-logo.png`, `kutuphane-kapak.webp` yükleyin. Dosya isimlerini değiştirmeyin. Tarayıcıda sayfayı yenileyin.

## Seslendirme hakkında
Tarayıcıda `speechSynthesis.getVoices()` ile sunulan cihaz sesleri seçilebilir. Safari'deki web uygulaması Siri asistanının kendi sesini doğrudan seçmeye zorlayamaz. Bir sonraki sürümde daha doğal konuşma için ses motoru seçenekleri ayrıca değerlendirilebilir. Ekran kilidinde kesintisiz oynatma mevcut sürümde garanti edilmez.

## Gizlilik
PDF içerikleri bu sürümde cihazın tarayıcı veritabanında saklanır; herhangi bir uzak dosya yükleme servisine gönderilmez. Ancak PDF.js ve fontlar ilk yüklemede harici CDN üzerinden yüklenir. Cihazda saklanan dosyalar tarayıcı verileri temizlenirse kaybolabilir.


## V2.4 — Görsel yerleşim düzeltmesi
- Kütüphanedeki **PDF Ekle** düğmesi artık **Eserlerim** başlığının yanında, tutarlı boşluklarla yer alır; mobilde de başlık grubuyla birlikte yerleşir.
- Kütüphane ve okuyucu bannerlarındaki kitap amblemleri üstten taşmak yerine banner içinde dikey olarak ortalanır.
- PDF saklama, kitap silme ve seslendirme JavaScript kodu değiştirilmedi.
- Tarayıcı önbelleği için CSS/JS sürüm parametresi `2.4` olarak güncellendi.
