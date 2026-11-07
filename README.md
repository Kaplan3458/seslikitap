# Sesli Kitap V2.2 — Kütüphane ve tasarım güncellemesi

- Yüklediğiniz PDF, IndexedDB'de saklanır; aynı cihaz ve tarayıcıda yeniden seçmeden açılır.
- Kütüphanede **Kitabı aç** ve **Kaldır** düğmeleri bulunur.
- **Kaldır** işleminde onay istenir. Onay verirseniz PDF dosyası cihazdaki IndexedDB'den ve kitap bilgileri listeden silinir. İşlem geri alınamaz.
- Okunmakta olan kitap silinirse oynatma durur ve Kütüphane açılır.
- Yeni ana sayfa görseli: `kutuphane-kapak.webp` (kullanıcının sağladığı görsel).
- Arayüz metinleri sadeleştirildi; renkler, kenarlıklar ve mobil yerleşim iyileştirildi.
- Safari tarayıcı verilerini temizlerseniz kayıtlı PDF'ler de kaybolabilir. Önemli PDF'lerin orijinallerini ayrıca saklayın.
- Web Speech API, iPhone kilit ekranında kesintisiz oynatma garantisi sunmaz.

## Kurulum
ZIP içindeki `index.html`, `script.js`, `styles.css`, `manifest.json`, `kutuphane-kapak.webp`, `README.md` dosyalarını GitHub deponuzun kök dizinine yükleyin. ZIP'in kendisini yüklemeyin. `index.html` ve `script.js` dosyaları birbiriyle birlikte güncellenmelidir.

## Teknik notlar
Silme fonksiyonu, IndexedDB işlemine öncelik verir; veritabanı silmesi başarısız olursa liste kaydı korunur. Bu sürüm otomatik tarayıcı işlev testinden geçirilmemiştir; farklı Safari sürümlerinde test edilmelidir.

# Sesli Kitap V2 — Zümrüt Kütüphane

## Kurulum
Bu klasördeki `index.html`, `styles.css`, `script.js` ve `manifest.json` dosyalarını GitHub deposunun köküne yükleyin. GitHub Pages `main` / `(root)` ayarını kullanıyorsanız site otomatik güncellenir. Önce eski sürümü ayrı bir dalda veya ZIP dosyasında saklayın.

## Bu sürümde
- Responsive zümrüt/altın tasarım: ana sayfa, kitaplık, okuyucu
- PDF.js ile yerel PDF metin çıkarma
- Web Speech API ile seçilebilir Türkçe sesler, hız/ton ayarı, cümleden devam
- Sayfa ve cümle konumu localStorage'da tutulur
- Görünürlük, ses hataları ve eşzamansız sayfa değişimi için iyileştirmeler
- PDF dosyaları IndexedDB içinde, tarayıcınızın bu cihazdaki yerel depolamasında saklanır; yeniden seçmeden açılabilir

## Bilinen sınırlar
- iPhone Safari'de ekran kilidi / arka plana geçiş sırasında Web Speech API güvenilir biçimde devam etmez.
- Taranmış (görüntü) PDF'lerde OCR yoktur.
- PDF.js ve Google Fonts CDN üzerinden yüklenir, ilk açılışta ağ gerekir.
- Türkçe cümle bölme `Intl.Segmenter` varsa onu, yoksa basit bir yedek yöntemi kullanır.
- Henüz PWA ikonları ve çevrimdışı servis çalışanı eklenmedi.
- Gerçek iPhone üzerinde test edilmedi; tarayıcıda elle kontrol edilmelidir.

## Kontrol listesi
1. Masaüstü ve iPhone Safari'de ana sayfa, kütüphane ve okuyucu sekmelerine geçin.
2. Metin içeren PDF yükleyin; sayfa ve cümle gezinmesini test edin.
3. Türkçe ses seçin; Oku/Duraklat, hız ve ton ayarlarını kontrol edin.
4. Sayfa değiştirirken seslendirmeyi deneyin.
5. Sayfayı yeniden yükleyin; PDF dosyasını yeniden seçmeden son konuma dönüşü kontrol edin.
6. Taranmış PDF'de açıklayıcı uyarının çıktığını doğrulayın.

## Gizlilik
Bu sürüm dosyaları bir sunucuya göndermeden tarayıcıda işler. Dosya adı ve okuma konumu localStorage içine, PDF dosyasının kendisi IndexedDB içine kaydedilir. Tarayıcı verileri silinirse veya farklı cihazda açılırsa kaydedilen kitaplar kullanılamaz. Önceki sürümde yalnızca adı saklanan kitaplar bir kez yeniden içe aktarılmalıdır. PDF.js ve Google Fonts kodları CDN'den yüklenmektedir.

## V2.1 — Kalıcı PDF kütüphanesi
- Yeni eklenen PDF dosyaları cihazdaki IndexedDB veritabanına kaydedilir.
- Kaldığım yerden devam et ve kitaplık kartları dosya seçici açmadan kaydedilmiş PDF dosyasını açar.
- Eski V2 ile eklenen kitaplar PDF saklanmadığı için tek sefer yeniden seçilmelidir.
- Gizli mod, depolama kotası, Safari tarayıcı verilerini temizleme veya cihaz değiştirme kayıtları etkileyebilir. Büyük PDF dosyaları depolama alanını doldurabilir.
- Bu işlem başka cihazlarla senkronizasyon veya iCloud yedeklemesi değildir.
