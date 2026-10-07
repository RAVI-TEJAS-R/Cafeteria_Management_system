interface ErrorMessageProps {
  message: string;
}

function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="message" role="alert">
      {message}
    </div>
  );
}

export default ErrorMessage;
