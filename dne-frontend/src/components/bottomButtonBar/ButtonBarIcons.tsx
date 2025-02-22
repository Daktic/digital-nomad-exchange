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

const WalletIcon = (props: any): VNode => (
    <svg
        width="50"
        height="40"
        viewBox="0 0 50 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <rect width="43.0233" height="40" fill="#D9D9D9"/>
        <rect x="16.2791" y="15.7576" width="33.7209" height="8.48485" fill="#1F1E1E"/>
    </svg>
)

export {PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon}
