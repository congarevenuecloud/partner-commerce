import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalModule } from 'ngx-bootstrap/modal';
import { CartService, PriceService, Cart} from '@congarevenuecloud/ecommerce';

import { CartListComponent } from './cart-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { cart } from '../test/data';
import { take } from 'rxjs/operators';

describe('CartComponent', () => {
  let component: CartListComponent;
  let fixture: ComponentFixture<CartListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CartListComponent],
      imports: [ModalModule.forRoot(),TranslateModule.forRoot()],
      providers:[
        { provide: CartService, useValue: jasmine.createSpyObj('CartService', { 'getMyCart': of(cart), 'getCurrentCartId': 'a1I790432107VdqEAE' })},
        { provide: PriceService, useValue: jasmine.createSpyObj('PriceService', ['getCartPrice'])}]
    }).compileComponents();
    fixture = TestBed.createComponent(CartListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();  
  });


  it('cart can be deleted when cart status is New', () =>{
    const cart: Cart = new Cart();
    cart.Status = 'New';
    const result =  component.canDelete(cart);
    expect(result).toBe(true);
  });

  it('cart cannot be delete when cart status is Finalized', () =>{
    const cart: Cart = new Cart();
    cart.Status = 'Finalized';
    const result =  component.canDelete(cart);
    expect(result).toBe(false);
  });

  it('cart can be activated when cart status is not Finalized', () =>{
    const cart: Cart = new Cart();
    cart.Status = 'New';
    cart.Id = 'a1I790432107VdqEAF';
    const result =  component.canActivate(cart);
    expect(result).toBe(true);
  });

  it('cart cannot be activate when cart status is Finalized', () =>{
    const cart: Cart = new Cart();
    cart.Status = 'Finalized';
    cart.Id = 'a1I790432107VdqEAE';
    const result =  component.canActivate(cart);
    expect(result).toBe(false);
  }); 

  it('Load view with table header info', () =>{
    component.loadView();
    component.view$.pipe(take(1)).subscribe(result => {
      expect(result.tableOptions.columns.length).toBe(6);
      expect(result.type.name).toEqual("Cart");
    })
  });
  

});
