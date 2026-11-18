import './Alert.css'

/* Mensaje inline para mostrar la respuesta del servidor.
   Los estilos viven aqui para reutilizarlos en cualquier pantalla. */
export default function Alert({ variant = 'error', children }) {
  return (
    <div className={`alert alert--${variant}`} role='alert'>
      {children}
    </div>
  )
}
