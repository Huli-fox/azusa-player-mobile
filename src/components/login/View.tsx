import Bilibili from './bilibili/Bilibili';
import YTM from './google/YTM';
import { Site } from '@enums/Network';
import SiteSelector from './SiteSelector';
import { useYTMLogin } from './google/useYTMLogin';
import useBiliLogin from './bilibili/useBiliLoginApp';
import { useAPM } from '@stores/usePersistStore';

const LoginPage = ({ loginSite }: { loginSite: Site }) => {
  const ytmLogin = useYTMLogin();
  const biliLogin = useBiliLogin();

  switch (loginSite) {
    case Site.Bilibili:
      return <Bilibili biliLogin={biliLogin} />;
    case Site.YTM:
      return <YTM ytmLogin={ytmLogin} />;
  }
};

export default () => {
  const { loginPage, setLoginPage } = useAPM();

  return (
    <SiteSelector
      LoginComponent={LoginPage}
      defaultSite={loginPage}
      onSiteChange={setLoginPage}
    />
  );
};
