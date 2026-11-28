import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const origin='http://localhost:5173';
const password='Browser fixture password 123';
function fixture(action:string,tag:string){execFileSync(process.execPath,['--import','tsx','backend/scripts/browser-fixture.ts',action,tag],{env:process.env,stdio:'pipe'});}
test('administrator publishes a product; customer saves, shops and contacts support',async({page,browser,isMobile},info)=>{
 test.setTimeout(90000);
 const tag=randomUUID(),email=tag+'-admin@example.invalid',customer=tag+'-customer@example.invalid',name='QA linen '+tag.slice(0,8);
 const buyer=await browser.newContext({viewport:page.viewportSize()??undefined});
 const b=await buyer.newPage();
 // Synthetic art only, no external asset requests.
 await page.route('https://example.invalid/qa.jpg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#eae4da"/></svg>'}));
 await b.route('https://example.invalid/qa.jpg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#eae4da"/></svg>'}));
 try{
  fixture('create',tag);
  await page.goto('/login');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/account');await expect(page).toHaveURL(/\/admin$/);await expect(page.getByRole('heading',{name:'Store overview'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'My Account',exact:true})).toHaveCount(0);
  if(isMobile)await page.getByRole('button',{name:'Sections',exact:true}).click();
  await page.getByRole('button',{name:'Products',exact:true}).click();await page.getByRole('button',{name:'Add product',exact:true}).click();
  await page.getByLabel('Product name').fill(name);await page.getByLabel('Slug',{exact:true}).fill(tag);await page.getByLabel('Price (₹)').fill('1500');
  const draft=page.locator('form').filter({has:page.getByRole('button',{name:'Create draft',exact:true})});
  await draft.locator('select[name=categoryId]').selectOption({label:'QA category '+tag});await draft.locator('select[name=brandId]').selectOption({label:'QA brand '+tag});
  await page.getByLabel('Description',{exact:true}).fill('Synthetic browser QA fixture.');
  await page.getByLabel('Image URL (optional for draft)').fill('https://example.invalid/qa.jpg');await page.getByLabel('Image alt text').fill('Synthetic textile sample');
  await page.getByLabel('SKU',{exact:true}).fill(tag);await page.getByLabel('Size',{exact:true}).fill('M');await page.getByLabel('Colour',{exact:true}).fill('Ivory');await page.getByLabel('Available stock').fill('3');
  await page.getByRole('button',{name:'Create draft'}).click();
  const row=page.locator('.admin-products-table tbody tr').filter({hasText:name});await expect(row).toContainText('Draft');await row.getByRole('button',{name:'Manage'}).click();await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(row).toContainText('Published');
  await page.screenshot({path:info.outputPath('admin-product.png'),fullPage:true});
  if(isMobile)await page.getByRole('button',{name:'Sections',exact:true}).click();
  await page.getByRole('navigation',{name:'Admin sections'}).getByRole('button',{name:'Shipments',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Shipment workspace'})).toBeVisible();
  await expect(page.getByRole('button',{name:'View queue'})).toHaveCount(5);
  await page.getByLabel('Search shipments').fill(tag);
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(page.getByText('No shipments match these filters.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Download labels (ZIP)'})).toBeDisabled();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath('admin-shipments.png'),fullPage:true});
  await b.goto(origin+'/login');await b.getByLabel('Email address').fill(customer);await b.getByLabel('Password',{exact:true}).fill(password);await b.getByRole('button',{name:'Sign in',exact:true}).click();await expect(b).toHaveURL(/\/account$/);await expect(b.getByRole('heading',{name:'My Account',exact:true})).toBeVisible();await expect(b.getByRole('link',{name:'Admin console',exact:true})).toHaveCount(0);
  await b.goto(origin+'/products/'+tag);await expect(b.getByRole('heading',{name})).toBeVisible();await b.getByRole('radio',{name:'M / Ivory'}).check();await b.getByRole('button',{name:'Add / update bag'}).click();await expect(b.getByText('Shopping bag updated.')).toBeVisible();await b.getByRole('button',{name:'Save to wishlist'}).click();await expect(b.getByText('Piece saved.')).toBeVisible();
  await b.goto(origin+'/cart');await expect(b.getByRole('link',{name,exact:true})).toBeVisible();await b.getByLabel('Quantity').selectOption('2');await expect(b.getByText('₹3,000',{exact:true}).first()).toBeVisible();
  await b.goto(origin+'/wishlist');await expect(b.getByRole('link',{name,exact:true})).toBeVisible();
  await b.goto(origin+'/checkout');await expect(b.getByText('Online test payments are not configured. No online charge can be made.')).toBeVisible();await expect(b.getByRole('button',{name:'Reserve items and continue to test payment'})).toBeDisabled();
  await b.goto(origin+'/support');await b.getByLabel('Subject').fill('QA request '+tag);await b.getByLabel('Message').fill('Synthetic browser support request.');await b.getByRole('button',{name:'Send request'}).click();await expect(b.getByText('Your support request is recorded.',{exact:false})).toBeVisible();
  if(isMobile)await page.getByRole('button',{name:'Sections',exact:true}).click();
  await page.getByRole('navigation',{name:'Admin sections'}).getByRole('button',{name:'Support',exact:true}).click();
  const ticket=page.locator('.admin-line').filter({hasText:'QA request '+tag});await ticket.getByLabel('Response').fill('Synthetic administrator reply.');await ticket.getByRole('button',{name:'Save response'}).click();
  await b.reload();await expect(b.getByText('Synthetic administrator reply.',{exact:false})).toBeVisible();
  await b.screenshot({path:info.outputPath('customer-support.png'),fullPage:true});
  await b.goto(origin+'/admin');await expect(b.getByRole('heading',{name:'Access denied'})).toBeVisible();
  await b.goto(origin+'/login');await b.getByLabel('Email address').fill(email);await b.getByLabel('Password',{exact:true}).fill(password);await b.getByRole('button',{name:'Sign in',exact:true}).click();await expect(b).toHaveURL(/\/admin$/);await b.goto(origin+'/account');await expect(b).toHaveURL(/\/admin$/);
  await b.goto(origin+'/login');await b.getByLabel('Email address').fill(customer);await b.getByLabel('Password',{exact:true}).fill(password);await b.getByRole('button',{name:'Sign in',exact:true}).click();await expect(b).toHaveURL(/\/account$/);await expect(b.getByRole('heading',{name:'My Account',exact:true})).toBeVisible();await expect(b.getByRole('link',{name:'Admin console',exact:true})).toHaveCount(0);
 }finally{await buyer.close();fixture('delete',tag);}
});

// Keep role switching independent of the longer catalogue workflow.
test('role-specific login and customer route isolation',async({page})=>{
 const tag=randomUUID(),admin=tag+'-admin@example.invalid',customer=tag+'-customer@example.invalid';
 try{
  fixture('create',tag);
  const signIn=async(email:string)=>{await page.goto('/login');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();};
  await signIn(admin);await expect(page).toHaveURL(/\/admin$/);
  for(const path of ['/account','/orders','/cart','/wishlist','/checkout','/support']){await page.goto(path);await expect(page).toHaveURL(/\/admin$/);await expect(page.getByRole('heading',{name:'My Account',exact:true})).toHaveCount(0);}
  await signIn(customer);await expect(page).toHaveURL(/\/account$/);await expect(page.getByRole('heading',{name:'My Account',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Admin console',exact:true})).toHaveCount(0);
  await page.goto('/admin');await expect(page.getByRole('heading',{name:'Access denied'})).toBeVisible();
 }finally{fixture('delete',tag);}
});
