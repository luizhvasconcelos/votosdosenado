import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="votosdosenado — página inicial">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>votos<span>do</span>senado</span>
    </Link>
  );
}
