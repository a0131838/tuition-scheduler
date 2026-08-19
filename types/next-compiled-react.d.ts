declare module "next/dist/compiled/react" {
  export function cache<Args extends unknown[], Result>(
    fn: (...args: Args) => Result,
  ): (...args: Args) => Result;
}
