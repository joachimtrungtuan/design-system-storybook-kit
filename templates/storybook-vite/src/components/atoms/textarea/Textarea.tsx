export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return <textarea className={`min-h-24 rounded-md border border-grey-neutral-300 px-3 py-2 text-body transition hover:border-grey-neutral-400 focus:border-semantic-action focus:outline focus:outline-2 focus:outline-semantic-action disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;
}
