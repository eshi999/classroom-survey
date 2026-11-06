type LoadingStateProps = {
  label: string
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <p className="px-6 py-16 text-center text-lg text-slate-600" role="status">
      {label}
    </p>
  )
}
