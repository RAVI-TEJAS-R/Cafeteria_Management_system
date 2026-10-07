interface LoadingProps {
  children: string;
}

function Loading({ children }: LoadingProps) {
  return <div className="loading-card">{children}</div>;
}

export default Loading;
