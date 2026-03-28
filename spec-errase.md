┌──────┬───────────────────────────────────────────────┬────────────┐  
 │ Fase │ Módulo │ Estado │  
 ├──────┼───────────────────────────────────────────────┼────────────┤  
 │ A │ Gestión de Propiedades (CRUD, wizard, status) │ Completada │  
 ├──────┼───────────────────────────────────────────────┼────────────┤
│ B │ Landing pública de propiedad │ Completada │  
 ├──────┼───────────────────────────────────────────────┼────────────┤  
 │ C │ Sistema de links segmentados │ Pendiente │  
 ├──────┼───────────────────────────────────────────────┼────────────┤  
 │ D │ CRM de contactos/leads │ Pendiente │  
 ├──────┼───────────────────────────────────────────────┼────────────┤  
 │ E │ Generación de contenido con IA │ Pendiente │  
 ├──────┼───────────────────────────────────────────────┼────────────┤  
 │ F │ Analytics básico │ Pendiente │
├──────┼───────────────────────────────────────────────┼────────────┤
│ G │ Calendario/Citas │ Pendiente │
├──────┼───────────────────────────────────────────────┼────────────┤
│ H │ Finanzas │ Pendiente │
└──────┴───────────────────────────────────────────────┴────────────┘

- Usuario hace click en el link que el agente inmobiliario comparte en sus redes sociales
- Usuario entra al detalle de la propiedad
- Usuario llena su nombre y numero de telefono (Debemos informarle que le escribiremos de forma  
  inmediata)
- En este punto el usuario es registrado como lead asociado a la propiedad en la que tiene interes
- Automaticamente asignamos una serie de propiedades de interes (No deberiamos enviarle la info de  
  todas estas de forma inmediata sino poco a poco y tambien cuando tengamos una nueva propiedad para  
  que si se envie de forma inmediata, bueno este flujo sera problema del backend)
- Usuario recibe mensaje automaticamente con un bot de whatsapp con la info completa de la propiedad  
  (fotos, videos, descripcion en mensaje, brochure, etc)
- Usuario conversa con el bot pidiendo informacion o pidiendo una cita para agendarla
- Bot revisa la disponibilidad de dia y hora para ofrecerle al usuario una cita
- Usuario confirma fecha y hora
- Bot de whatsapp notifica al agente inmobiliario via whatsapp (igual el agente tendra un bot  
  personalizado que manejara y reportara todo)
- Agente confirma la fecha y hora para tal propiedad con tal cliente
- Bot de whatsapp le confirma la cita al cliente
- Se registra automaticamente en el calendario del agente el evento y ademas en nuestro sistema  
  propio de citas
- Bot envia link para que el usuario agregue el evento a su calendario
- Bot notifica al cliente 2 horas antes que tiene una cita con el agente inmobililario
- Bot de agente notifica 2 horas antes que tiene una cita con el cliente
