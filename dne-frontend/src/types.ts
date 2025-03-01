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