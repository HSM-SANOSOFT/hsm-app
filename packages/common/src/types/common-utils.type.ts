export type DtoClass<T extends object = object> = new (...args: never[]) => T;
