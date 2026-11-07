# Sesli Kitap

PDF yükle, sayfa sayfa sesli dinle. Hız/ton/ses ayarlanabilir, cümleye tıklayıp oradan devam edebilirsin (ezber için tekrar etmek kolay).

## Nasıl çalışır

- PDF metni tarayıcıda PDF.js ile okunur (dosya hiçbir sunucuya yüklenmez, tamamen cihazda kalır).
- Sesli okuma tarayıcının yerleşik Web Speech API'si ile yapılır (iOS Safari'nin sistem sesleri).
- **Önemli kısıtlama:** Ekran kilitlenirse veya Safari arka plana alınırsa okuma durur. Dinlerken ekranı açık ve Safari'yi önde tutman gerekiyor. (Bu, v2'de bulut TTS + arka plan ses oynatıcıya geçilerek çözülecek.)

## GitHub Pages'e yayınlama

1. github.com'da yeni bir repo oluştur (örn. `sesli-kitap`), **public** olarak.
2. Bu klasördeki dosyaları (`index.html`, `styles.css`, `script.js`, `manifest.json`) o repoya yükle:
   ```
   cd "sesli kitap"
   git init
   git add index.html styles.css script.js manifest.json README.md
   git commit -m "Sesli kitap v1"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADIN/sesli-kitap.git
   git push -u origin main
   ```
3. Repo sayfasında **Settings → Pages** bölümüne git, "Source" olarak `main` branch / `/ (root)` seç, kaydet.
   iOS Safari'de kullanmanın güvenliği: iPhone'da **Ayarlar > Safari > Erişilebilirlik > Sesli Okuma** gibi sistem ayarlarına dokunmana gerek yok, uygulama kendi ses listesini gösterir.

## iPhone'da kullanma

1. Verilen `https://KULLANICI_ADIN.github.io/sesli-kitap/` adresini Safari'de aç.
2. Paylaş düğmesi → **Ana Ekrana Ekle** ile uygulama gibi ikon oluşturabilirsin.
3. PDF Seç'e bas, kitabı seç, Oku'ya bas.
4. Cümleye dokunarak o cümleden okumayı başlatabilirsin — tekrar dinlemek/ezber için pratik.
