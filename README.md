CM Manager
==========

Web app de gestión integral para Community Managers.

Stack:
- React + Vite
- Supabase
- TailwindCSS
- Framer Motion
- Lucide React
- date-fns
- react-big-calendar
- dnd-kit

Setup:
1. Entra en la carpeta del proyecto: cd cm-manager
2. Instala dependencias: npm install
3. Configura .env.local con tus credenciales de Supabase:
   VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
4. Ejecuta el SQL de supabase/schema.sql en Supabase SQL Editor.
5. Crea usuarios en Supabase Authentication para tu equipo de 10 personas.
6. Inicia la app: npm run dev

Build:
npm run build

Deploy:
Puedes desplegar en Vercel, Netlify o cualquier hosting estático.
El proyecto incluye vercel.json y public/_redirects para SPA routing.
