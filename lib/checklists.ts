// Checklist definitions (build spec §6). State is stored locally by `key`.

export interface ChecklistItem {
  key: string;
  label: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const CHECKLISTS: ChecklistGroup[] = [
  {
    id: "bolso",
    title: "Bolso al sanatorio",
    items: [
      { key: "bolso-cedula", label: "Cédula de identidad" },
      { key: "bolso-carne", label: "Carné perinatal con tus controles" },
      { key: "bolso-seguro", label: "Carné de IPS o seguro (si tenés)" },
      { key: "bolso-estudios", label: "Estudios y ecografías recientes" },
      { key: "bolso-camisones", label: "Camisones abiertos adelante" },
      { key: "bolso-bombachas", label: "Bombachas cómodas y corpiños de lactancia" },
      { key: "bolso-toallas", label: "Toallas higiénicas grandes para el posparto" },
      { key: "bolso-higiene", label: "Artículos de higiene personal" },
      { key: "bolso-chinelas", label: "Chinelas, medias y campera liviana" },
      { key: "bolso-cargador", label: "Cargador de celular con cable largo" },
      { key: "bolso-bodies", label: "Bodies y enteritos para el bebé" },
      { key: "bolso-gorrito", label: "Gorrito, medias y mantita" },
      { key: "bolso-panales", label: "Pañales para recién nacido y toallitas" },
      { key: "bolso-ropa-bebe", label: "Ropa para que el bebé vuelva a casa" },
    ],
  },
  {
    id: "tramites",
    title: "Trámites después del nacimiento",
    items: [
      { key: "tramite-certificado", label: "Retirar el certificado de nacido vivo del sanatorio" },
      { key: "tramite-registro", label: "Inscribir el nacimiento en el Registro Civil" },
      { key: "tramite-nacimiento", label: "Retirar el certificado de nacimiento" },
      { key: "tramite-cedula", label: "Tramitar la primera cédula del bebé" },
      { key: "tramite-ips", label: "Anotar al bebé como beneficiario en IPS (si corresponde)" },
      { key: "tramite-controles", label: "Agendar el primer control del bebé y las vacunas (PAI)" },
    ],
  },
];
