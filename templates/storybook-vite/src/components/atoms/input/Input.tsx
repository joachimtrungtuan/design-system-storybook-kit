export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`rounded-md border border-grey-neutral-300 px-3 py-2 text-body transition hover:border-grey-neutral-400 focus:border-semantic-action focus:outline focus:outline-2 focus:outline-semantic-action disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;
}
