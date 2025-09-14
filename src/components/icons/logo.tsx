import Image from "next/image";

export function Logo(props: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Valley Farm Secrets Logo"
      width={40}
      height={40}
      className={props.className}
    />
  );
}
