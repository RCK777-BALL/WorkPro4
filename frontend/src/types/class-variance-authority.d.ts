declare module 'class-variance-authority' {
  type VariantRecord = Record<string, Record<string, string>>;

  interface CVAConfig<V extends VariantRecord = VariantRecord> {
    variants?: V;
    defaultVariants?: Partial<{ [K in keyof V]: keyof V[K] }>;
  }

  type CVAProps<V extends VariantRecord> = {
    className?: string;
  } & {
    [K in keyof V]?: keyof V[K];
  };

  export type VariantProps<T> = T extends (props?: infer P) => any
    ? NonNullable<P>
    : never;

  export function cva<V extends VariantRecord = VariantRecord>(
    base?: string,
    config?: CVAConfig<V>,
  ): (props?: CVAProps<V>) => string;

  export default cva;
}
