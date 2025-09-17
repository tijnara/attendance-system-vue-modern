# Attendance System (Vue 3 + Tailwind)

Modern, clean UI for fingerprint (stub), RFID, and barcode attendance. Proxied to `http://goatedcodoer:8080`.

## Dev (100.119.3.44)
```bash
npm i
npm run dev -- --host 0.0.0.0 --port 5173
# http://100.119.3.44:5173
```

## Build + Serve
```bash
npm run build
npm run preview  # http://100.119.3.44:5000
```

## Nginx
See sample config in the previous message; ensure `/api` is proxied to `http://goatedcodoer:8080`.
