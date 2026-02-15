import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Modal = ({ open, onClose, children, className }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto",
        className
      )}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  )
}

const ModalHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
)

const ModalTitle = ({ className, ...props }) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)

const ModalContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
)

const ModalFooter = ({ className, ...props }) => (
  <div className={cn("flex items-center justify-end space-x-2 p-6 pt-0", className)} {...props} />
)

export { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter }
