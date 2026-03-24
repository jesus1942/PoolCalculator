const BASE_ACCESSORY_SCOPE = [
  '4 retornos orientables',
  '1 toma de aspiración',
  '1 toma de fondo',
  '1 skimmer',
  'bomba de filtrado',
  'filtro',
  'luces',
  'tablero con timer mecánico',
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getAdditionalName = (additional: any) =>
  additional?.customName ||
  additional?.accessory?.name ||
  additional?.equipment?.name ||
  additional?.material?.name ||
  'Item adicional';

const getPlumbingItemName = (item: any) =>
  item?.itemName ||
  item?.name ||
  item?.label ||
  item?.description ||
  'Ítem hidráulico';

const isExtraPlumbingItem = (item: any) => {
  const name = normalize(getPlumbingItemName(item));

  return (
    name.includes('hidromas') ||
    name.includes('hidrojet') ||
    name.includes('hidromasajeador') ||
    name.includes('cascada') ||
    name.includes('pasamanos') ||
    name.includes('retorno') ||
    name.includes('aspir') ||
    name.includes('toma')
  );
};

const classifyInstallationTier = (extraPlumbingItems: any[], projectAdditionals: any[]) => {
  const names = [
    ...extraPlumbingItems.map((item) => normalize(getPlumbingItemName(item))),
    ...projectAdditionals.map((additional) => normalize(getAdditionalName(additional))),
  ];

  const hasPlatinumFeature = names.some((name) =>
    name.includes('caldera') ||
    name.includes('caldaia') ||
    name.includes('heater') ||
    name.includes('heat pump')
  );

  const hasPremiumFeature = names.some((name) =>
    name.includes('cascada') ||
    name.includes('pasamanos')
  );

  const hasPersonalizedFeature = names.some((name) =>
    name.includes('retorno') ||
    name.includes('aspir') ||
    name.includes('toma') ||
    name.includes('hidro') ||
    name.includes('jet') ||
    name.includes('bomba')
  );

  if (hasPlatinumFeature) return 'platinum';
  if (hasPremiumFeature) return 'premium';
  if (hasPersonalizedFeature || extraPlumbingItems.length > 0 || projectAdditionals.length > 0) return 'personalizada';
  return 'basica';
};

export const buildProjectCommercialProfile = (projectLike: {
  plumbingConfig?: any;
  projectAdditionals?: any[];
}) => {
  const plumbingConfig = (projectLike.plumbingConfig as any) || {};
  const selectedPlumbingItems = Array.isArray(plumbingConfig.selectedItems) ? plumbingConfig.selectedItems : [];
  const projectAdditionals = Array.isArray(projectLike.projectAdditionals) ? projectLike.projectAdditionals : [];

  const basePlumbingItems = selectedPlumbingItems.filter((item: any) => !isExtraPlumbingItem(item));
  const extraPlumbingItems = selectedPlumbingItems.filter((item: any) => isExtraPlumbingItem(item));
  const installationTier = classifyInstallationTier(extraPlumbingItems, projectAdditionals);

  return {
    installationTier,
    installationTierLabel:
      installationTier === 'platinum'
        ? 'Instalación platinum'
        : installationTier === 'premium'
          ? 'Instalación premium'
          : installationTier === 'personalizada'
            ? 'Instalación personalizada'
            : 'Instalación básica',
    baseAccessoryScope: BASE_ACCESSORY_SCOPE,
    basePlumbingItems,
    extraPlumbingItems,
    extraAdditionals: projectAdditionals.map((additional: any) => ({
      id: additional.id,
      name: getAdditionalName(additional),
      quantity: additional.newQuantity || 0,
      customUnit: additional.customUnit || null,
    })),
  };
};

