// Logo oficial de Doña Isidora (public/brand, generados desde DI1color.png):
//  - "color": texto verde oscuro, para fondos claros.
//  - "negativo": texto blanco, para fondos oscuros (header, login).
//  - "isotipo": solo las franjas verdes, para espacios chicos.
type Variante = 'color' | 'negativo' | 'isotipo'

const SRC: Record<Variante, string> = {
  color: '/brand/logo.png',
  negativo: '/brand/logo-negativo.png',
  isotipo: '/brand/isotipo.png',
}

export function Logo({ variante = 'color', className = 'h-8' }: { variante?: Variante; className?: string }) {
  return <img src={SRC[variante]} alt="Doña Isidora" className={`${className} w-auto select-none`} draggable={false} />
}
