export interface Asset {
    symbol: string | undefined,
    name: string | undefined,
    token_img: string | undefined,
    address: string | undefined,
}

export interface Wallet {
    assets: Asset[];
}

export interface Pool {
    address: string;
    symbol: string,
    tokenA: Asset,
    tokenB: Asset,
    lpToken: Asset,
}

export type liquidtyPoolDisplay = {
    pool: string;
    tokenA: string;
    tokenB: string;
    lpTokenA: string;
    lpTokenB: string;
    lpToken: string;
    owner: string;
};