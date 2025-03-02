export interface Asset {
    symbol: string,
    name: string,
    token_img: string,
    address: string,
    price: number,
}

export interface Wallet {
    assets: Asset[];
}

export interface Pool {
    symbol: string,
    apy: number,
    tokenA: Asset,
    tokenB: Asset,
}