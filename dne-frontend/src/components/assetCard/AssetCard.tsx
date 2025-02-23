import styles from "./AssetCard.module.css";
import {Asset} from "../../types"

// Prop Types
interface AssetCardProps {
    asset: Asset;
}
interface AssetImgProps {
    symbol: string;
    img_uri: string;
}

interface AssetSymbolProps {
    symbol: string;
}

interface AssetNameProps {
    asset_name: string
}

interface AssetPriceProps {
    price: number;
}


const AssetCard = ({asset}: AssetCardProps) => {
    return (
        <div className={styles.card}>
            <AssetImg symbol={asset.symbol} img_uri={asset.token_img} />
            <AssetSymbol symbol={asset.symbol} />
            <AssetName asset_name={asset.name} />
            <AssetPrice price={asset.price} />
        </div>
    )
}

const AssetImg = ({symbol, img_uri}: AssetImgProps) => (
    <div>
        <img alt={symbol} src={img_uri}/>
    </div>
)

const AssetSymbol = ({symbol}: AssetSymbolProps) => (
    <div>
        <p>{symbol}</p>
    </div>
)

const AssetName = ({asset_name}: AssetNameProps) => (
    <div>
        <p>{asset_name}</p>
    </div>
)

const AssetPrice = ({price}: AssetPriceProps) => (
    <div>
        <p>{price}</p>
    </div>
)

export {AssetCard};