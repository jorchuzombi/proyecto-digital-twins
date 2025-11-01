// src/app/components/address-autocomplete/address-autocomplete.component.ts
import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GeocodingService, GeocodingResult } from '../../services/geocoding.service';

@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './address-autocomplete.component.html',
  styleUrls: ['./address-autocomplete.component.scss']
})
export class AddressAutocompleteComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Buscar dirección...';
  @Input() city: string = '';
  @Input() initialValue: string = '';
  @Output() addressSelected = new EventEmitter<GeocodingResult>();

  searchQuery: string = '';
  results: GeocodingResult[] = [];
  isLoading: boolean = false;
  showDropdown: boolean = false;
  noResults: boolean = false;
  highlightedIndex: number = -1;

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private blurTimeout?: any;

  constructor(private geocodingService: GeocodingService) {
    this.setupSearch();
  }

  ngOnInit() {
    if (this.initialValue) {
      this.searchQuery = this.initialValue;
    }
  }

  private setupSearch() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 3) {
          this.results = [];
          this.noResults = false;
          return [];
        }

        this.isLoading = true;
        console.log('🔍 Buscando:', query);

        return this.geocodingService.searchAddress(query, this.city);
      })
    ).subscribe({
      next: (results) => {
        this.isLoading = false;
        this.results = results || [];
        this.noResults = this.results.length === 0 && this.searchQuery.length >= 3;
        console.log('✅ Resultados:', this.results.length);
      },
      error: (error) => {
        this.isLoading = false;
        this.results = [];
        this.noResults = true;
        console.error('❌ Error en búsqueda:', error);
      }
    });
  }

  onSearchChange(event: any) {
    const value = event.target.value;
    this.searchQuery = value;
    this.showDropdown = true;
    this.searchSubject.next(value);
  }

  onFocus() {
    this.showDropdown = true;
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
  }

  onBlur() {
    this.blurTimeout = setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  selectResult(result: GeocodingResult) {
    console.log('✅ Dirección seleccionada:', result.display_name);
    this.searchQuery = result.display_name;
    this.showDropdown = false;
    this.addressSelected.emit(result);
  }

  clearSearch() {
    this.searchQuery = '';
    this.results = [];
    this.noResults = false;
    this.showDropdown = false;
  }

  getResultType(result: GeocodingResult): string {
    if (result.type) {
      const types: { [key: string]: string } = {
        'house': 'Casa',
        'street': 'Calle',
        'road': 'Carrera',
        'suburb': 'Barrio',
        'city': 'Ciudad',
        'town': 'Municipio',
        'village': 'Vereda'
      };
      return types[result.type] || result.type;
    }
    return 'Lugar';
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
  }
}
