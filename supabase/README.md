# Licencias centralizadas

1. Ejecutar `licencias.sql` en el SQL Editor del proyecto Supabase.
2. Antes de cargar los módulos de `index.html` y `admin.html`, el hosting debe
   definir la configuración pública:

```html
<script>
  window.NEWCOM_CONFIG = {
    SUPABASE_URL: 'https://<proyecto>.supabase.co',
    SUPABASE_KEY: '<anon-key>'
  };
</script>
```

Con esa configuración, cliente y administración consultan la tabla
`licencias` y las funciones atómicas de Supabase. Sin configuración remota,
NEWCOM conserva un registro local único por navegador para permitir operar sin
dejar la aplicación inutilizable; ese modo no sincroniza equipos distintos.

El panel de administración debe publicarse con controles de acceso propios
del hosting/Supabase. La clave `service_role` nunca debe ir en estos archivos.
