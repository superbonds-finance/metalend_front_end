import React, { useEffect,useCallback, useState } from "react";
import { notify } from "../../utils/notifications";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection,sendTransaction } from "../../contexts/connection";
import { SUPERBONDS_PROGRAM_ID,
         STAKING_DATA_ACCOUNT,
         USDC_MINT_ADDRESS,
         SUPERB_MINT_ADDRESS,
         LP_TOKEN_30_MINT_ADDRESS,
         LP_TOKEN_90_MINT_ADDRESS,
         POOL_30_ADDRESS,
         POOL_90_ADDRESS,
         USDC_DECIMALS,
         SUPERB_DECIMALS,
         LP_TOKEN_DECIMALS,
         PLATFORM_DATA_ACCOUNT,
         SUPERB_REWARDS_POOL_ADDRESS,
         SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
         SUNNY_MINT_ADDRESS, SABER_MINT_ADDRESS, ORCA_MINT_ADDRESS,
       } from "../../utils/ids";
import { findAssociatedTokenAddress } from "../../contexts/accounts";
import {POOL_DATA_LAYOUT,PoolDataLayout} from "../../utils/pool_data_layout";
import {PLATFORM_DATA_LAYOUT,PlatformDataLayout} from "../../utils/platform_data_layout";
import {STAKING_DATA_LAYOUT,StakingDataLayout} from "../../utils/staking_data_layout";
import {TRADER_LAYOUT/* ,TraderLayout */} from "../../utils/trader_layout";
import {FARMING_REWARD_LAYOUT} from "../../utils/farming_reward_layout";
import {ButtonText,Text,HeroText,HoverToolTip, InputWrapper} from "./buy-sb.styled";
import BN from "bn.js";
import axios from 'axios';
import {AxiosResponse} from 'axios';
import {
  Numberu64,numberFormatter,
  convertTimeStamp,
  getTokenBalance,delay,
  formatNumberWithoutRounding,
  formatInputNumber, unformatInputNumber,
  numOnly, noSpecial } from "../../utils/utils";
import {
  Account,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {  AccountLayout,
          TOKEN_PROGRAM_ID,
 } from "@solana/spl-token";
import Swal from 'sweetalert2';
import '../../styles/trade.css';
import { MdSwapVert ,MdRefresh} from "react-icons/md";
import {GoSettings} from "react-icons/go"
import { GlobalStyle } from "../redeem/redeem.styled";
import { HeaderCard } from "../../components/HeaderCard";
import { Tooltip } from "antd";
import { ImInfo } from "react-icons/im";
import MenuDivider from "antd/lib/menu/MenuDivider";
import { SHOW_PARENT } from "rc-tree-select";
import Modal from "./Modal";
import logo2 from "../../assets/coinType/logo2.jpg";
import logo3 from "../../assets/coinType/logo3.jpg";

import {SettingModal} from "./setting-modal"

interface ParamTypes {
  trade_account: string
}
 
export function BuySBView() {

  const connection = useConnection();
  const wallet = useWallet();
  // const { trade_account } = useParams<ParamTypes>();
  const [showModal, setShowModal] = React.useState(false);
  const [APYSBLP,setAPYSBLP] = useState<any>();
  const [sb_amount,setSB_Amount] = useState("");
  const [sol_sb_lp_amount,setSOL_SB_LP_Amount] = useState("");
  const onChangeSB_amount = useCallback( (e) => {
    const { value } = e.target;
    setSB_Amount(formatInputNumber(value));
  },[]);

  

  const onChangeSOL_SB_LP_Amount = useCallback( (e) => {
    const { value } = e.target;
    setSOL_SB_LP_Amount(formatInputNumber(value));
  },[]);


  // const [SOLbalance,setSOLbalance] = useState(0);
  const [USDCbalance,setUSDCbalance] = useState<any>(0);
  const [SuperBbalance,setSuperBbalance] = useState<any>(0);
  const [LP30balance,setLP30balance] = useState<any>(0);
  const [LP90balance,setLP90balance] = useState<any>(0);
  const [SOL_SB_LPbalance,setSOL_SB_LPbalance] = useState<any>(0);

  const [traderData,setTraderData] = useState<any>(null);
  const [PlatformData, setPlatformData] = useState<any>();
  const [StakingData, setStakingData] = useState<any>();
  const [SuperB_Rewards_Balance,setSuperB_Rewards_Balance] = useState(0);
  const [transactionFees,setTransactionFees] = useState<any>();
  const [showSettingModal,setshowSettingModal] = useState<any>(false);

  const readPoolData_30 = async () => {
    const encodedPoolDataState = (await connection.getAccountInfo(POOL_30_ADDRESS, 'singleGossip'))!.data;
    const decodedPoolDataState = POOL_DATA_LAYOUT.decode(encodedPoolDataState) as PoolDataLayout;
    let transactionFeeSuperB = new BN(decodedPoolDataState.transaction_fee_SuperB, 10, "le").toNumber() / (10**USDC_DECIMALS);
    setTransactionFees(transactionFeeSuperB);
  }

  const onRefresh = async () =>{
    await getTraderDataAccount();
    await getPlatformData();
    await getAllBalances();
    // console.log('here')
  }

  const getAllBalances = async () => {
    if ( !wallet){
      // notify({
      //   message: 'Please connect to Solana network',
      //   type: "error",
      // });
      return;
    }
    if (!wallet.publicKey){
      // notify({
      //   message: 'Please connect to Solana network',
      //   type: "error",
      // });
      return;
    }
    //setSOLbalance(await connection.getBalance(wallet.publicKey)/(10**9));
    setUSDCbalance(await getTokenBalance(connection,wallet.publicKey,USDC_MINT_ADDRESS,USDC_DECIMALS));
    setLP30balance(await getTokenBalance(connection,wallet.publicKey,LP_TOKEN_30_MINT_ADDRESS,LP_TOKEN_DECIMALS));
    setLP90balance(await getTokenBalance(connection,wallet.publicKey,LP_TOKEN_90_MINT_ADDRESS,LP_TOKEN_DECIMALS));
    setSuperBbalance(await getTokenBalance(connection,wallet.publicKey,SUPERB_MINT_ADDRESS,SUPERB_DECIMALS));

  }

  const fetchAPY= async ()=>{
    const APY30LP:AxiosResponse<any> = await axios.get('https://mainnet-api.superbonds.finance/SB_Staking_APY ');
    setAPYSBLP(APY30LP.data.APY)
   }

  useEffect(()=>{
    fetchAPY()
   },[])

  useEffect(() => {
    readPoolData_30()
    if (!wallet.publicKey) return;
    onRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  // useEffect(() => {
  //   if (!wallet.publicKey) return;
  //   if (!traderData || !PlatformData) return;
  //   getRewardDataAccount();
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [traderData,PlatformData]);
  //
  const getTraderDataAccount = async () => {
    if ( !wallet){
      notify({
        message: 'Please connect to Solana network',
        type: "error",
      });
      return;
    }
    let publicKey = wallet.publicKey;
    if (!publicKey){
      notify({
        message: 'Please connect to Solana network',
        type: "error",
      });
      return;
    }
    let filters = [
          {
            "dataSize":560
          },
          {
            "memcmp": {
              "offset": 0,
              "bytes": publicKey.toBase58()
            }
          }];
    const resp = await connection.getProgramAccounts(SUPERBONDS_PROGRAM_ID, {
      commitment: connection.commitment,
      filters,
      encoding: 'base64',
    });
    if (resp.length > 0){
      let decodedData = TRADER_LAYOUT.decode(resp[0].account.data);
      //console.log(decodedData);
      setTraderData(decodedData);
    }

  }
  const getPlatformData = async () => {
    const response:AxiosResponse<any> = await axios.get('https://mainnet-api.superbonds.finance/platformData ');
    let decodedPoolDataState = response.data as PlatformDataLayout;
    setPlatformData(decodedPoolDataState);
  }

  return (
    <>
 {showSettingModal &&  <SettingModal />}
    <div className="w-screen h-screen bg-black">
      <div  className="w-7/12 my-0 mx-auto pt-20 lg:pt-24 md:pt-20 lg:w-11/12 md:w-12/12" style={{maxWidth:"1000px"}}>
        <div className=" flex justify-end  mt-8 pt-0 w-8/12 2xl:w-8/12 xl:w-8/12 lg:w-8/12 md:w-12/12 sm:w-full mx-auto">
            <MdRefresh className="text-2xl"/>
            <GoSettings className="ml-3 text-2xl"/>
        </div>
        <div className=" mt-2 pt-0 w-8/12 2xl:w-8/12 xl:w-8/12 lg:w-8/12 md:w-12/12 sm:w-full bg-gray-300 neon-bottom-card selected-box-neon rounded-md mx-auto">
          <div className="w-full bg-green-100 py-2 rounded-t-md text-center">
            <HeroText size={"16px"} transform={"true"} weight={'true'} color='black' style={{ fontFamily:"Archivo"}}>BUY SB</HeroText>
          </div>
          <div className="flex justify-center md:flex-wrap ">
          <div className="flex flex-col w-12/12 2xl:w-11/12 xl:w-11/12 md:w-8/12 sm:w-12/12 ml-4 py-5 px-7 md:my-4 md:mx-0 mt-2 sm:py-0 sm:px-0 md:mb-1">
            <div className="bg-gray-200 p-1 rounded-md">
              <div className=" flex flex-col w-full p-3 rounded-md col-span-3 lg:col-span-3 md:col-span-3 sm:col-span-3" style={{height:"max-content" ,"background":'#161D23'}}>
                <div className="flex justify-evenly">
                  <div className="flex flex-col">
                      <Text className='select-none' size={"14px"} color={"#7c7c7c"} weight='bold' >USDC Balance</Text>
                      <Text className='cursor-pointer' onClick={()=>setSB_Amount(formatInputNumber(String(SuperBbalance)))}>10000</Text>
                  </div>
                  <div style={{borderLeft: '3px solid #7c7c7c'}}></div>
                  {/* <div className="hidden lg:block md:hidden sm:block" style={{borderBottom: '3px solid #7c7c7c' ,  marginBottom: '6px'}}></div> */}
                  <div className="flex flex-col">
                    <Text className='select-none' size={"14px"} color={"#7c7c7c"} weight='bold' >SB Balance:</Text>
                    <Text className='cursor-pointer' onClick={()=>setSB_Amount(formatInputNumber(String(numberFormatter.format(new BN(traderData.total_SuperB_staked, 10, "le").toNumber()/1000000))))}>12,500</Text>

                  </div>
                </div>
               
              </div>

              <div className="text-center bg-gray-200 py-3 px-3 border rounded-md mt-3">
                <Text className="block" opacity={"0.5"} weight='bold'>You Pay</Text>
                <InputWrapper className='bg-gray-400 rounded-md mt-3 px-3 py-2 flex justify-between items-center'>
                  <button type="button" onClick={()=>setShowModal(true)} className="py-2 px-2 rounded-lg flex items-center hover:bg-gray-200">
                    <div className="w-6 h-6 text-xs flex items-center justify-center rounded-full">
                      <span className='span1'>
                        <span className='span2'>
                        {/* <img alt="logo" aria-hidden="true" src="data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%2724%27%20height=%2724%27/%3e" style="display: block; max-width: 100%; width: initial; height: initial; background: none; opacity: 1; border: 0px; margin: 0px; padding: 0px;"> */}
                        <img
                          className="rounded-full"
                          src={logo2}
                          alt="..."
                        />
                        </span>
                        {/* <img alt="USDC" srcset="/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&amp;w=32&amp;q=75 1x, /_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&amp;w=48&amp;q=75 2x" src="/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&amp;w=48&amp;q=75" decoding="async" data-nimg="intrinsic" className="rounded-full" style="position: absolute; inset: 0px; box-sizing: border-box; padding: 0px; border: none; margin: auto; display: block; width: 0px; height: 0px; min-width: 100%; max-width: 100%; min-height: 100%; max-height: 100%;"> */}
                      </span>
                  </div>
                  <div className="ml-4 mr-2 font-semibold" translate="no">USDC</div>
                  <div className="text-white fill-current">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="inherit" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.292893C0.683416 -0.097631 1.31658 -0.097631 1.7071 0.292893L4.99999 3.58579L8.29288 0.292893C8.6834 -0.0976311 9.31657 -0.0976311 9.70709 0.292893C10.0976 0.683417 10.0976 1.31658 9.70709 1.70711L5.7071 5.70711C5.31657 6.09763 4.68341 6.09763 4.29289 5.70711L0.292893 1.70711C-0.0976309 1.31658 -0.0976309 0.683417 0.292893 0.292893Z" fill="inherit">
                    </path>
                  </svg>
                  </div>
                  </button>
                  <input maxLength={20}
                    style={{textAlign:'right'}}
                    onKeyDown={numOnly}
                    onKeyPress={noSpecial}
                    onChange={onChangeSB_amount} value={sb_amount}
                    className="w-full py-2 px-2 h-10 rounded-md bg-gray-400 focus:outline-none  focus:ring-green-100 focus:border-transparent placeholder-green-100"
                    placeholder="SB Token Amount" />
                  </InputWrapper>
              </div>
              <div className="flex text-center justify-center" >
                  <MdSwapVert className="text-3xl" />
              </div>

              <div className="text-center bg-gray-200 py-3 px-3 border rounded-md mt-3">
                <Text className="block" opacity={"0.5"} weight='bold'>You Get</Text>
                <InputWrapper className='bg-gray-400 rounded-md mt-3 px-3 py-2 flex justify-between items-center'>
                  <button type="button" onClick={()=>setShowModal(true)} className="py-2 px-2 rounded-lg flex items-center hover:bg-gray-200">
                    <div className="w-6 h-6 text-xs flex items-center justify-center rounded-full">
                      <span className='span1'>
                        <span className='span2'>
                        {/* <img alt="logo" aria-hidden="true" src="data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%2724%27%20height=%2724%27/%3e" style="display: block; max-width: 100%; width: initial; height: initial; background: none; opacity: 1; border: 0px; margin: 0px; padding: 0px;"> */}
                        <img
                          className="rounded-full"
                          src={logo3}
                          alt="..."
                        />
                        </span>
                        {/* <img alt="USDC" srcset="/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&amp;w=32&amp;q=75 1x, /_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&amp;w=48&amp;q=75 2x" src="/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&amp;w=48&amp;q=75" decoding="async" data-nimg="intrinsic" className="rounded-full" style="position: absolute; inset: 0px; box-sizing: border-box; padding: 0px; border: none; margin: auto; display: block; width: 0px; height: 0px; min-width: 100%; max-width: 100%; min-height: 100%; max-height: 100%;"> */}
                      </span>
                  </div>
                  <div className="ml-4 mr-2 font-semibold" translate="no">BTC</div>
                  <div className="text-white fill-current">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="inherit" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.292893C0.683416 -0.097631 1.31658 -0.097631 1.7071 0.292893L4.99999 3.58579L8.29288 0.292893C8.6834 -0.0976311 9.31657 -0.0976311 9.70709 0.292893C10.0976 0.683417 10.0976 1.31658 9.70709 1.70711L5.7071 5.70711C5.31657 6.09763 4.68341 6.09763 4.29289 5.70711L0.292893 1.70711C-0.0976309 1.31658 -0.0976309 0.683417 0.292893 0.292893Z" fill="inherit">
                    </path>
                  </svg>
                  </div>
                  </button>
                  <input maxLength={20}
                    style={{textAlign:'right'}}
                    onKeyDown={numOnly}
                    onKeyPress={noSpecial}
                    onChange={onChangeSB_amount} value={sb_amount}
                    className="w-full py-2 px-2 h-10 rounded-md bg-gray-400 focus:outline-none  focus:ring-green-100 focus:border-transparent placeholder-green-100"
                    placeholder="SB Token Amount" />
                  </InputWrapper>
                
              </div>
            </div>
            {/* <Text opacity={"50%"}>Fees:0.5%+500SB</Text> */}
            <div className="grid grid-cols-1 gap-2 mt-3">
              <div>
                <button   className="border-2 hover:bg-green-100 hover:text-black  rounded-md w-full border-green-100 px-6 py-1.5
              inline-block">
                  <ButtonText transform weight>Swap</ButtonText>
                </button>
              </div>
             
            </div>
          </div>
        </div>
        </div>
        {/* <div className='flex flex-wrap justify-center w-full  md:w-12/12 md:mx-auto md:my-0' style={{marginTop:'3rem'}}>
          <div className="flex flex-col w-8/12 md:w-full sm:w-full bg-gray-300 py-8 px-7 rounded-md md:my-4 md:ml-0 mt-2 max-h-90 neon-bottom-card selected-box-neon" style={{maxWidth:"500px"}}>
            <div className="text-center">
              <Text size ={"19px"} transform={"true"}>STAKE SB</Text>
            </div>

            <div className="bg-gray-200 py-3 pl-3 pr-3  mt-2 rounded-md">
              <table className="w-full">
                <tr>
                  <th className="float-left"><Text opacity={"50%"} >Balance:</Text></th>
                  <td className="text-right px-2"><Text className='cursor-pointer' onClick={()=>setSB_Amount(formatInputNumber(String(SuperBbalance)))}>{numberFormatter.format(SuperBbalance)}</Text></td>
                </tr>
                <tr>
                  <th className="float-left"><Text opacity={"50%"}>Staked:</Text></th>
                  <td className="text-right px-2"><Text className='cursor-pointer' onClick={()=>setSB_Amount(formatInputNumber(String(numberFormatter.format(new BN(traderData.total_SuperB_staked, 10, "le").toNumber()/1000000))))}>{traderData ? numberFormatter.format(new BN(traderData.total_SuperB_staked, 10, "le").toNumber()/1000000): '0.00'}</Text></td>
                </tr>
              </table>
            </div>

            <div className="text-center bg-gray-200 py-3 px-3 border rounded-md mt-3">
              <Text className="block" opacity={"0.5"}>Enter SB Token</Text>
              <input
                maxLength={20}
                onKeyDown={numOnly}
                onKeyPress={noSpecial}
                type='tel'
                value = {sb_amount}
                onChange={onChangeSB_amount}
                className="w-full py-2 px-2 h-10 mt-3 rounded-md bg-gray-400
                focus:outline-none ring-1 ring-green-100 focus:ring-green-100 focus:border-transparent placeholder-green-100" placeholder="Token Amount" />
            </div>


            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <button onClick={()=>onStakeSB()} className="border-2 hover:bg-green-100 hover:text-black rounded-md w-full border-green-100 px-6 py-1.5 inline-block">
                    <ButtonText transform weight >Stake</ButtonText>
                </button>
              </div>
              <div>
                <button onClick={()=>onUnstakeSB()} className="border-2 hover:bg-green-100 hover:text-black rounded-md w-full border-green-100 px-6 py-1.5 inline-block">
                    <ButtonText transform weight>Unstake</ButtonText>
                </button>
              </div>
            </div>
          </div>
        </div> */}
      </div>
      <GlobalStyle />
      <Modal setShowModal={setShowModal} showModal={showModal} />
    </div>
    </>
    )
}
