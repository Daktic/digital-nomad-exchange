import {Asset, Pool, Wallet} from "../dne-frontend/src/types"

const mockAssets: Asset[] = [
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    },
    {
        symbol: "TEST",
        name: "Test Asset",
        token_img: "https://picsum.photos/50",
        address: '0x123',
        price: 245
    }
]

export const mockPools: Pool[] = [
    {
        symbol: "TEST-USDC",
        apy: 0.2,
        tokenA: mockAssets[0],
        tokenB: mockAssets[1],
    },
    {
        symbol: "TEST-ETH",
        apy: 0.2,
        tokenA: mockAssets[2],
        tokenB: mockAssets[3],
    },
    {
        symbol: "TEST-sTEST",
        apy: 0.2,
        tokenA: mockAssets[4],
        tokenB: mockAssets[5],
    },
    {
        symbol: "TEST-USDT",
        apy: 0.2,
        tokenA: mockAssets[6],
        tokenB: mockAssets[7],
    },{
        symbol: "TEST-USDC",
        apy: 0.2,
        tokenA: mockAssets[0],
        tokenB: mockAssets[1],
    },
    {
        symbol: "TEST-ETH",
        apy: 0.2,
        tokenA: mockAssets[2],
        tokenB: mockAssets[3],
    },
    {
        symbol: "TEST-sTEST",
        apy: 0.2,
        tokenA: mockAssets[4],
        tokenB: mockAssets[5],
    },
    {
        symbol: "TEST-USDT",
        apy: 0.2,
        tokenA: mockAssets[6],
        tokenB: mockAssets[7],
    },
]

export const mockWallet: Wallet = {
    assets: mockAssets,
}