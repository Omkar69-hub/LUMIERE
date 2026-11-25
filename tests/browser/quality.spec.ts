import {test,expect} from '@playwright/test';
test('responsive layout, page metadata and visible keyboard focus',async({page},info)=>{
 for(const [path,title] of [['/','A quieter kind of luxury'],['/login','Sign in'],['/signup','Create account'],['/shop','The collection'],['/privacy','Privacy notice']]){
  await page.goto(path);await expect(page).toHaveTitle(new RegExp(title));await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex,nofollow');await expect(page.locator('main')).toHaveCount(1);await expect(page.locator('h1')).toHaveCount(1);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath((path==='/'?'home':path.slice(1))+'.png'),fullPage:true,animations:'disabled'});
 }
 await page.goto('/login');const input=page.getByLabel('Email address');await input.focus();await expect(input).toBeFocused();await expect.poll(()=>input.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
});
