import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchHistory } from './search-history';

describe('SearchHistory', () => {
  let component: SearchHistory;
  let fixture: ComponentFixture<SearchHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
