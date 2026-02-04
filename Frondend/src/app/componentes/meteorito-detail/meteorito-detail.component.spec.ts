import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeteoritoDetailComponent } from './meteorito-detail.component';

describe('MeteoritoDetailComponent', () => {
  let component: MeteoritoDetailComponent;
  let fixture: ComponentFixture<MeteoritoDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeteoritoDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeteoritoDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
