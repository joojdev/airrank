import {
  faCheck,
  faRotateRight,
  faShareNodes,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "sage";
}

export function Button({ variant = "default", className = "", ...rest }: ButtonProps) {
  const variantClass = variant === "default" ? "" : ` pp-button--${variant}`;
  return (
    <button type="button" className={`pp-button${variantClass} ${className}`.trim()} {...rest} />
  );
}

export function Window({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pp-window ${className}`.trim()}>
      {title ? <div className="pp-window__title">{title}</div> : null}
      <div className="pp-window__body">{children}</div>
    </section>
  );
}

const ICONS: Record<"check" | "cross" | "share" | "restart", IconDefinition> = {
  check: faCheck,
  cross: faXmark,
  share: faShareNodes,
  restart: faRotateRight,
};

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return <FontAwesomeIcon icon={ICONS[name]} fixedWidth aria-hidden="true" />;
}
