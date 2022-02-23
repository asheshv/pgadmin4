/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useSnackbar, SnackbarProvider, SnackbarContent } from 'notistack';
import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import { NotifierMessage, MESSAGE_TYPE } from '../components/FormComponents';
import CustomPropTypes from '../custom_prop_types';
import gettext from 'sources/gettext';
import _ from 'lodash';
import pgWindow from 'sources/window';
import ModalProvider, { useModal } from './ModalProvider';

const AUTO_HIDE_DURATION = 3000;  // In milliseconds

let snackbarRef;
let notifierInitialized = false;
export function initializeNotifier(notifierContainer) {
  notifierInitialized = true;
  const RefLoad = ()=>{
    snackbarRef = useSnackbar();
    return <></>;
  };

  if (!notifierContainer) {
    notifierContainer = document.createElement('div');
    document.body.appendChild(notifierContainer);
  }

  ReactDOM.render(
    <Theme>
      <SnackbarProvider
        maxSnack={30}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <RefLoad />
      </SnackbarProvider>
    </Theme>, notifierContainer
  );
}

let modalRef;
let modalInitialized = false;
export function initializeModalProvider(modalContainer) {
  modalInitialized = true;
  const RefLoad = ()=>{
    modalRef = useModal();
    return <></>;
  };

  if (!modalContainer) {
    modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
  }

  ReactDOM.render(
    <Theme>
      <ModalProvider>
        <RefLoad />
      </ModalProvider>
    </Theme>, modalContainer
  );
}

const FinalNotifyContent = React.forwardRef(({children}, ref) => {
  return <SnackbarContent style= {{justifyContent:'end'}} ref={ref}>{children}</SnackbarContent>;
});
FinalNotifyContent.displayName = 'FinalNotifyContent';
FinalNotifyContent.propTypes = {
  children: CustomPropTypes.children,
};

var Notifier = {
  success(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.SUCCESS, autoHideDuration);
  },
  warning(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.WARNING, autoHideDuration);
  },
  info(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.INFO, autoHideDuration);
  },
  error(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.ERROR, autoHideDuration);
  },
  notify(content, autoHideDuration) {
    if (content) {
      if(!notifierInitialized) {
        initializeNotifier();
      }
      let  options = {autoHideDuration, content:(key) => (
        <FinalNotifyContent>{React.cloneElement(content, {onClose:()=>{snackbarRef.closeSnackbar(key);}})}</FinalNotifyContent>
      )};
      options.content.displayName = 'content';
      snackbarRef.enqueueSnackbar(null, options);
    }
  },
  _callNotify(msg, type, autoHideDuration) {
    if (!_.isNull(autoHideDuration)) {
      this.notify(<NotifierMessage type={type} message={msg} closable={false} />, autoHideDuration);
    } else {
      this.notify(<NotifierMessage type={type} message={msg}/>, null);
    }
  },

  pgRespErrorNotify(xhr, error, prefixMsg='') {
    var contentType = xhr.getResponseHeader('Content-Type');
    if (xhr.status === 410) {
      const pgBrowser = window.pgAdmin.Browser;
      pgBrowser.report_error(gettext('Error: Object not found - %s.', xhr.statusText), xhr.responseJSON.errormsg);
    } else {
      try {
        if (xhr.status === 0) {
          error = gettext('Connection to the server has been lost.');
        } else {
          if(contentType){
            if(contentType.indexOf('application/json') >= 0) {
              var resp = JSON.parse(xhr.responseText);
              error = _.escape(resp.result) || _.escape(resp.errormsg) || gettext('Unknown error');
            }
          }
          if (contentType.indexOf('text/html') >= 0) {
            error = gettext('INTERNAL SERVER ERROR');
            console.warn(xhr.responseText);
          }
        }
      }
      catch(e){
        error = e.message;
      }

      this.error(prefixMsg + ' ' + error);
    }
  },

  pgNotifier(type, xhr, promptmsg, onJSONResult) {
    var msg = xhr.responseText,
      contentType = xhr.getResponseHeader('Content-Type');

    if (xhr.status == 0) {
      msg = gettext('Connection to the server has been lost.');
      promptmsg = gettext('Connection Lost');
    } else {
      if (contentType) {
        try {
          if (contentType.indexOf('application/json') == 0) {
            var resp = JSON.parse(msg);

            if(resp.info == 'CRYPTKEY_MISSING') {
              var pgBrowser = window.pgAdmin.Browser;
              pgBrowser.set_master_password('', ()=> {
                if(onJSONResult && typeof(onJSONResult) == 'function') {
                  onJSONResult('CRYPTKEY_SET');
                }
              });
              return;
            } else if (resp.result != null && (!resp.errormsg || resp.errormsg == '') &&
              onJSONResult && typeof(onJSONResult) == 'function') {
              return onJSONResult(resp.result);
            }
            msg = _.escape(resp.result) || _.escape(resp.errormsg) || 'Unknown error';
          }
          if (contentType.indexOf('text/html') == 0) {
            if (type === 'error') {
              this.alert('Error', promptmsg);
            }
            return;
          }
        } catch (e) {
          this.alert('Error', e.message);
        }
      }
    }
    this.alert(promptmsg, msg.replace(new RegExp(/\r?\n/, 'g'), '<br />'));
  },
  alert: (title, text, onOkClick, okLabel=gettext('OK'))=>{
    /* Use this if you want to use pgAdmin global notifier.
    Or else, if you want to use modal inside iframe only then use ModalProvider eg- query tool */
    if(!modalInitialized) {
      initializeModalProvider();
    }
    modalRef.alert(title, text, onOkClick, okLabel);
  },
  confirm: (title, text, onOkClick, onCancelClick, okLabel=gettext('Yes'), cancelLabel=gettext('No'))=>{
    /* Use this if you want to use pgAdmin global notifier.
    Or else, if you want to use modal inside iframe only then use ModalProvider eg- query tool */
    if(!modalInitialized) {
      initializeModalProvider();
    }
    modalRef.confirm(title, text, onOkClick, onCancelClick, okLabel, cancelLabel);
  },
  showModal(title, content) {
    if(!modalInitialized) {
      initializeModalProvider();
    }
    modalRef.showModal(title, content);
  }
};

if(window.frameElement) {
  Notifier = pgWindow.Notifier || Notifier;
} else if(!pgWindow.Notifier){
  pgWindow.Notifier = Notifier;
}
export default Notifier;
