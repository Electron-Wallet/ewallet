/* @flow */

import styled from 'styled-components';
import React from 'react';
import { FONT_SIZE, FONT_WEIGHT, SCREEN_SIZE } from 'config/variables';
import { NavLink } from 'react-router-dom';
import colors from 'config/colors';

import Indicator from './components/Indicator';
import {
  inject,
  observer
} from 'mobx-react';
import { matchPath } from "react-router";
import { withNamespaces } from "react-i18next";

const Wrapper = styled.div`
    position: relative;
    display: flex;
    height: 100%;
    flex: 1;
    align-items: center;
    padding: 0px 30px 0 35px;
    overflow-y: hidden;
    overflow-x: auto;

    @media screen and (max-width: ${SCREEN_SIZE.MD}) {
        justify-content: space-between;
    }

    @media screen and (max-width: ${SCREEN_SIZE.SM}) {
        padding: 0px 16px;
    }
`;

const StyledNavLink = styled(NavLink)`
    font-weight: ${FONT_WEIGHT.MEDIUM};
    font-size: ${FONT_SIZE.TOP_MENU};
    color: ${colors.TEXT_SECONDARY};
    margin: 0px 4px;
    padding: 20px 35px;
    white-space: nowrap;

    @media screen and (max-width: ${SCREEN_SIZE.MD}) {
        padding: 20px 10px;
    }

    @media screen and (max-width: ${SCREEN_SIZE.XS}) {
        font-size: ${FONT_SIZE.BASE};
        padding: 20px 10px;
    }

    &.active,
    &:hover {
        transition: all 0.3s ease-in-out;
        color: ${colors.TEXT_PRIMARY};
    }

    &:first-child {
        margin-left: 0px;
    }

    &:last-child {
        margin-right: 0px;
    }
`;

type Props = {
  router: $ElementType<State, 'router'>,
  selectedAccount: $ElementType<State, 'selectedAccount'>,
};

class TopNavigationAccount extends React.Component<Props> {
  wrapperRefCallback = (element: ?HTMLElement) => {
    this.wrapper = element;
  };

  wrapper: ?HTMLElement;

  render() {
    const { t } = this.props;
    const { eWalletDevice } = this.props.appState;
    if (!eWalletDevice || !eWalletDevice.features || !eWalletDevice.features.device_id) {
      return null;
    }

    const { pathname } = this.props.history.location;
    const match = matchPath(pathname, {
      path: '/device/:device/network/:network',
      exact: false,
      strict: false
    });

    let network;
    if ( match && match.params.network) {
      network = match.params.network.toLowerCase();
    } else {
      return null;
    }

    const basePath = `/device/${eWalletDevice.features.device_id}/network/${network}/account/0`;

    return (
      <Wrapper className="account-tabs" ref={this.wrapperRefCallback}>
        <StyledNavLink exact to={`${basePath}`}>{t('Summary')}</StyledNavLink>
        <StyledNavLink to={`${basePath}/receive`}>{t('Receive')}</StyledNavLink>
        <StyledNavLink to={`${basePath}/send`}>{t('Send')}</StyledNavLink>
        <Indicator pathname={pathname} wrapper={() => this.wrapper}/>
      </Wrapper>
    );
  }
}

TopNavigationAccount.propTypes = {
};

export default withNamespaces()(inject((stores) => {
  return {
    appState: stores.appState
  };
})(observer(TopNavigationAccount)));
