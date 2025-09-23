# Attendance System (Vue 3 + Tailwind)

Modern, clean UI for fingerprint (stub) and RFID attendance. Proxied to `http://goatedcodoer:8080`.

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


## Feature Flags
To disable specific input fields in the Scanner view without code changes elsewhere, edit the booleans in `src/config.js`:

```js
// src/config.js
export const DISABLE_EMPLOYEE_NO = false  // set to true to disable the Employee No input
export const DISABLE_RFID = false         // set to true to disable the RFID input and related autofocus/submit
```

- When `DISABLE_EMPLOYEE_NO` is true, the Employee No field becomes disabled.
- When `DISABLE_RFID` is true, the RFID field is disabled and the app will not auto-focus or submit via that field.
