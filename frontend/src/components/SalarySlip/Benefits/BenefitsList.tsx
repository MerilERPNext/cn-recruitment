import { useScreenSize } from "../../../hooks/useScreenSize";

type Props = {};

const BenefitsList = (props: Props) => {
  const { isDesktop } = useScreenSize();
  const MobileLayout = () => {
    return <div>Mobile Layout for Benefits List</div>;
  };

  const DesktopLayout = () => {
    return <div>Desktop Layout for Benefits List</div>;
  };

  return <div>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>;
};

export default BenefitsList;
