// Spinner.jsx
// Componente de carga reutilizable con animación

export default function Spinner({ texto = "Cargando...", size = "md" }) {
  const sizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-2 border-rdc-border border-t-rdc-accent
                    rounded-full animate-spin`}
      />
      {texto && <p className="text-rdc-muted text-sm">{texto}</p>}
    </div>
  )
}