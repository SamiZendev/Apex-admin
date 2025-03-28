export const isTokenExpired = (issued_at: string, expires_in: string) => {
  const currentTime = Math.floor(Date.now() / 1000);
  return (
    currentTime >=
    Math.floor(new Date(issued_at).getTime() / 1000) + Number(expires_in)
  );
};

export const formatTimestamp = (date: Date): string => {
  const pad = (num: number, size: number): string => String(num).padStart(size, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1, 2);
  const day = pad(date.getDate(), 2);
  const hours = pad(date.getHours(), 2);
  const minutes = pad(date.getMinutes(), 2);
  const seconds = pad(date.getSeconds(), 2);
  const milliseconds = pad(date.getMilliseconds(), 6); // Pad to 6 digits

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};
