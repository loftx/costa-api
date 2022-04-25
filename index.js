module.exports = class CostaApi {

  constructor(browser, server) {
    this.debugOutput = false;

    this.browser = browser;
    this.server = server;

    this.balanceCheckUrl = 'https://gifting.costa.co.uk/balance-check';
    this.balanceCheckTextboxElementId = 'MainContent_Content1_ctl02_tbToken';
    this.balanceCheckResultElementClass = 'big';
    this.balanceCheckResultRegex = /Your current balance: £([0-9].[0-9]{2})<br>Your Gift card number: \*\*\*\*\*\*\*\*\*\*\*\*[0-9]{4}/g;
  }

  setBrowser(browser) {
    this.browser = browser;
  }

  setServer(server) {
    this.server = server;
  }

  setDebugOutput(value) {
    this.debugOutput = value;
  }

  debug(output) {
    if (this.debugOutput) {
      console.log('costa-api - ' + output);
    }
  }

  async getBalance(giftCardNumber) {

    const webdriver = require('selenium-webdriver');

    try {
      this.debug('driver starting...');
      var driver = await new webdriver.Builder().forBrowser(this.browser)
        .usingServer(this.server)
        .build();
      this.debug('driver started');
    } catch (error) {
      this.debug('driver start errored: ' + error.toString());
      // evntuall got here with Error: Could not create selenium webdriver instance: WebDriverError: Unknown error: {
      throw new Error('Could not create selenium webdriver instance: ' + error.toString(), { cause: error });
    }

    try {
      this.debug('getting balance check page...');
      await driver.get(this.balanceCheckUrl);
      this.debug('got balance check page');
    } catch (error) {
      this.debug('getting balance errored: ' + error.toString());
      await driver.quit();
      throw new Error('Could not load balance check URL: ' + error.toString(), { cause: error });
    }

    try {
      this.debug('getting results page...');
      await driver.findElement(webdriver.By.id(this.balanceCheckTextboxElementId)).sendKeys(giftCardNumber, webdriver.Key.RETURN);
      this.debug('got results page');
    } catch (error) {
      this.debug('got results page errored: ' + error.toString());
      await driver.quit();
      throw new Error('Could not find gift card number text box: ' + error.toString(), { cause: error });
    }

    var balanceHtml = '';

    try {
      this.debug('checking results page...');
      balanceHtml = await driver.findElement(webdriver.By.className(this.balanceCheckResultElementClass)).getAttribute('innerHTML');
      await driver.quit();
      this.debug('checked results page');
    } catch (error) {

      const errorHtml = await driver.findElement(webdriver.By.css('h1')).getAttribute('innerHTML');

      if (errorHtml == 'Access Denied') {
        this.debug('Access denied error from server');
        await driver.quit();
        throw new Error('Access denied error from server');
      }

      this.debug('checking results page errored: ' + error.toString());
      await driver.quit();
      throw new Error('Gift card number HTML element not returned: ' + error.toString(), { cause: error });
    }

    this.debug('checking balance...');
    const matches = this.balanceCheckResultRegex.exec(balanceHtml);

    if (matches === null) {
      this.debug('checking balance errored - no matches');
      throw new Error('Gift card balance text not found');
    } else {
      this.debug('checking balance - matches: ' + matches.toString());
      this.debug('checked balance');
      this.debug('balance: ' + matches[1]);
    }

    return matches[1];
    
  }

}