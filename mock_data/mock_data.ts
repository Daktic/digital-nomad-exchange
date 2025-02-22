import {Asset, Wallet} from "../dne-frontend/src/types"

const mockAssets: Asset[] = [
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "www.picsilum.com",
        address: '0x123',
        price: 245
    }
]

export const mockWallet: Wallet = {
    assets: mockAssets,
}