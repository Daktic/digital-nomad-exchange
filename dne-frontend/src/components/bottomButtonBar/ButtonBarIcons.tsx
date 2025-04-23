import {VNode} from 'preact'


const PortfolioIcon = (props: any): VNode => (
    <svg
        width="60"
        height="59"
        viewBox="0 0 60 59"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    {...props}
    >
        <path d="M55 31C55 44.8071 43.8071 56 30 56C16.1929 56 5 44.8071 5 31C5 17.1929 16.1929 6 30 6C43.8071 6 55 17.1929 55 31Z" fill="white"/>
        <path d="M53.025 39.0629C51.4346 42.7614 48.947 46.0205 45.7797 48.5552C42.6124 51.09 38.8619 52.8232 34.8561 53.6034C30.8503 54.3835 26.7111 54.1869 22.8004 53.0306C18.8897 51.8744 15.3266 49.7937 12.4225 46.9705C9.51854 44.1473 7.36204 40.6676 6.14159 36.8355C4.92114 33.0034 4.6739 28.9357 5.4215 24.988C6.16909 21.0403 7.88874 17.3328 10.4301 14.1895C12.9715 11.0463 16.2572 8.56311 20 6.95704M55 29.5C55 26.2716 54.3534 23.0749 53.097 20.0923C51.8406 17.1097 49.9991 14.3997 47.6777 12.1169C45.3562 9.83414 42.6002 8.02335 39.5671 6.78792C36.5339 5.55249 33.283 4.91663 30 4.91663V29.5H55Z" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    )

const SupplyIcon = (props: any): VNode => (
    <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <path d="M50 25C50 38.8071 38.8071 50 25 50C11.1929 50 -1.65263e-06 38.8071 -1.65263e-06 25C-1.65263e-06 11.1929 11.1929 1.49012e-06 25 1.49012e-06C38.8071 1.49012e-06 50 11.1929 50 25Z" fill="white"/>
        <path d="M45 25C45 36.0457 36.0457 45 25 45C13.9543 45 5 36.0457 5 25C5 13.9543 13.9543 5 25 5C36.0457 5 45 13.9543 45 25Z" fill="#1F1E1E" fill-opacity="0.5"/>
    </svg>
)

const SwapIcon = (props: any): VNode => (
    <svg
        width="85"
        height="51"
        viewBox="0 0 85 51"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <path d="M50 25C50 38.8071 38.8071 50 25 50C11.1929 50 0 38.8071 0 25C0 11.1929 11.1929 -2.94511e-05 25 -2.94511e-05C38.8071 -2.94511e-05 50 11.1929 50 25Z" fill="#D9D9D9" fill-opacity="0.5"/>
        <path d="M84.3931 25.5C84.3931 39.3071 73.2002 50.5 59.3931 50.5C45.5859 50.5 34.3931 39.3071 34.3931 25.5C34.3931 11.6929 45.5859 0.500001 59.3931 0.500001C73.2002 0.500001 84.3931 11.6929 84.3931 25.5Z" fill="#1F1E1E" fill-opacity="0.5"/>
    </svg>
)

const SwapAndSupplyIcon = (props: any): VNode => (
    <svg
        width="70"
        height="58"
        viewBox="0 0 70 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <path
            d="M40 38C40 49.0457 31.0457 58 20 58C8.9543 58 0 49.0457 0 38C0 26.9543 8.9543 18 20 18C31.0457 18 40 26.9543 40 38Z"
            fill="#D9D9D9" fill-opacity="0.5"/>
        <path
            d="M70 38C70 49.0457 61.0457 58 50 58C38.9543 58 30 49.0457 30 38C30 26.9543 38.9543 18 50 18C61.0457 18 70 26.9543 70 38Z"
            fill="white"/>
        <path
            d="M65 38C65 46.2843 58.2843 53 50 53C41.7157 53 35 46.2843 35 38C35 29.7157 41.7157 23 50 23C58.2843 23 65 29.7157 65 38Z"
            fill="black"/>
        <path
            d="M55 20C55 31.0457 46.0457 40 35 40C23.9543 40 15 31.0457 15 20C15 8.95432 23.9543 1.19209e-06 35 1.19209e-06C46.0457 1.19209e-06 55 8.95432 55 20Z"
            fill="white"/>
        <path
            d="M50 20C50 28.2843 43.2843 35 35 35C26.7157 35 20 28.2843 20 20C20 11.7157 26.7157 5 35 5C43.2843 5 50 11.7157 50 20Z"
            fill="#1F1E1E" fill-opacity="0.5"/>
    </svg>
)

const HomeIcon = (props: any): VNode => (
    <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <path
            d="M18 44V24H30V44M6 18L24 4L42 18V40C42 41.0609 41.5786 42.0783 40.8284 42.8284C40.0783 43.5786 39.0609 44 38 44H10C8.93913 44 7.92172 43.5786 7.17157 42.8284C6.42143 42.0783 6 41.0609 6 40V18Z"
            stroke="#B3B3B3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

)

interface WalletIconProps {
    fillColor?: string;
    accentColor?: string;
}

const WalletIcon = ({
                        fillColor = "#D9D9D9",
                        accentColor = "#1F1E1E",
                        ...props
                    }: WalletIconProps): VNode => (
    <svg
        width="50"
        height="40"
        viewBox="0 0 50 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <rect width="43.0233" height="40" fill={fillColor}/>
        <rect x="16.2791" y="15.7576" width="33.7209" height="8.48485" fill={accentColor}/>
    </svg>
)

export {PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon, HomeIcon, SwapAndSupplyIcon}
