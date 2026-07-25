import { TestBed } from '@angular/core/testing';

import { SearchState } from './search-state';

describe('SearchState', () => {
  let service: SearchState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
