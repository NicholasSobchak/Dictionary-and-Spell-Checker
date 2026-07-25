import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandableList } from './expandable-list';

describe('ExpandableList', () => {
  let component: ExpandableList;
  let fixture: ComponentFixture<ExpandableList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandableList],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpandableList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
