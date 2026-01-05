import React, { JSX } from "react";

/* ======================================================
   Types
====================================================== */

type TypographyVariant =
    | "display1"
    | "display2"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "subheading"
    | "body"
    | "bodyMedium"
    | "bodySmall"
    | "label";

type TypographyAlign =
    | "inherit"
    | "left"
    | "center"
    | "right"
    | "justify";

type TypographyColor =
    | "inherit"
    | "info"
    | "white"
    | "title"
    | "body1"
    | "body2"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "disabled"
    | "link";

type TypographyProps<T extends React.ElementType = "span"> = {
    children: React.ReactNode;
    variant?: TypographyVariant;
    component?: T;
    align?: TypographyAlign;
    color?: TypographyColor;
    gutterBottom?: boolean;
    noWrap?: boolean;
    className?: string;
    style?: React.CSSProperties;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "color">;

/* ======================================================
   Internal Mappings
====================================================== */

const VARIANT_ELEMENT_MAP: Record<
    TypographyVariant,
    keyof JSX.IntrinsicElements
> = {
    display1: "h1",
    display2: "h2",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    subheading: "h6",
    body: "p",
    bodyMedium: "p",
    bodySmall: "p",
    label: "span",
};

const VARIANT_CLASSES: Record<TypographyVariant, string> = {
    /* Display */
    display1: "text-display-1 font-brand",
    display2: "text-display-2 font-brand",

    /* Headings */
    h1: "text-h1 font-brand",
    h2: "text-h2 font-brand",
    h3: "text-h3 font-brand",
    h4: "text-h4 font-brand",

    /* Subheading */
    subheading: "text-subheading font-medium",

    /* Body */
    body: "text-body",
    bodyMedium: "text-body-medium",
    bodySmall: "text-body-sm text-gray-600",

    /* Label */
    label: "text-label uppercase",
};

const ALIGN_CLASSES: Record<TypographyAlign, string> = {
    inherit: "",
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
};

const COLOR_CLASSES: Record<TypographyColor, string> = {
    inherit: "inherit",
    white: "text-white",
    info: "text-info",
    title: "text-text-title",
    body1: "text-text-body1",
    body2: "text-text-body2",
    primary: "text-text-primary",
    secondary: "text-secondary-500",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    disabled: "text-text-disabled",
    link: "text-text-link",
};

/* ======================================================
   Component
====================================================== */

export function Typography<T extends React.ElementType = "span">(
    props: TypographyProps<T>
) {
    const {
        children,
        variant = "body",
        component,
        align = "inherit",
        color = "inherit",
        gutterBottom = false,
        noWrap = false,
        className = "",
        style,
        ...rest
    } = props;

    const Component = component || VARIANT_ELEMENT_MAP[variant];

    const classes = [
        VARIANT_CLASSES[variant],
        ALIGN_CLASSES[align],
        COLOR_CLASSES[color],
        gutterBottom && "mb-1.5",
        noWrap && "truncate",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <Component className={classes} style={style} {...rest}>
            {children}
        </Component>
    );
}
