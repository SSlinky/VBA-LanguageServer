export {}; // ensures this is treated as a module

declare global {
    interface Number {
        isOdd(): boolean;
        isEven(): boolean;
    }
}

Number.prototype.isOdd = function (): boolean {
    return Number(this) % 2 !== 0;
};

Number.prototype.isEven = function (): boolean {
    return Number(this) % 2 === 0;
};