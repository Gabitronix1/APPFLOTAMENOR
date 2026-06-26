interface LogoTriangulosProps {
  size?: number
}

export function LogoTriangulos({ size = 40 }: LogoTriangulosProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Doña Isidora"
    >
      <polygon points="20,2 33,24 7,24" fill="#70B838" />
      <polygon points="12,18 25,40 -1,40" fill="#18885F" />
      <polygon points="28,18 41,40 15,40" fill="#70B838" opacity="0.75" />
    </svg>
  )
}
